/* eslint-disable import/max-dependencies */
import { basename } from "path"
import { sortImportMap } from "@jsenv/import-map"
import { resolveUrl, urlToRelativeUrl, assertAndNormalizeDirectoryUrl } from "@jsenv/util"
import { readPackageFile } from "./internal/readPackageFile.js"
import { resolveNodeModule } from "./internal/resolveNodeModule.js"
import { resolvePackageMain } from "./internal/resolvePackageMain.js"
import { visitPackageImports } from "./internal/visitPackageImports.js"
import { visitPackageExports } from "./internal/visitPackageExports.js"

export const generateImportMapForPackage = async ({
  logger,
  projectDirectoryUrl,
  rootProjectDirectoryUrl,
  manualOverrides = {},
  includeDevDependencies = false,
  includeExports = true,
  // pass ['browser', 'default'] to read browser first then 'default' if defined
  // in package exports field
  favoredExports = [],
  includeImports = true,
  selfImport = true,
}) => {
  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl)
  if (typeof rootProjectDirectoryUrl === "undefined") {
    rootProjectDirectoryUrl = projectDirectoryUrl
  } else {
    rootProjectDirectoryUrl = assertAndNormalizeDirectoryUrl(rootProjectDirectoryUrl)
  }

  const projectPackageFileUrl = resolveUrl("./package.json", projectDirectoryUrl)
  const rootProjectPackageFileUrl = resolveUrl("./package.json", rootProjectDirectoryUrl)

  const imports = {}
  const scopes = {}
  const seen = {}

  const markPackageAsSeen = (packageFileUrl, importerPackageFileUrl) => {
    if (packageFileUrl in seen) {
      seen[packageFileUrl].push(importerPackageFileUrl)
    } else {
      seen[packageFileUrl] = [importerPackageFileUrl]
    }
  }

  const packageIsSeen = (packageFileUrl, importerPackageFileUrl) => {
    return packageFileUrl in seen && seen[packageFileUrl].includes(importerPackageFileUrl)
  }

  const visit = async ({
    packageFileUrl,
    packageName,
    packageJsonObject,
    importerPackageFileUrl,
    importerPackageJsonObject,
    includeDevDependencies,
  }) => {
    await visitPackage({
      packageFileUrl,
      packageName,
      packageJsonObject,
      importerPackageFileUrl,
      importerPackageJsonObject,
    })
    await visitDependencies({
      packageFileUrl,
      packageJsonObject,
      includeDevDependencies,
    })
  }

  const visitPackage = async ({
    packageFileUrl,
    packageName,
    packageJsonObject,
    importerPackageFileUrl,
    importerPackageJsonObject,
  }) => {
    const packageInfo = computePackageInfo({
      packageFileUrl,
      packageName,
      importerPackageFileUrl,
    })

    await visitPackageMain({
      packageFileUrl,
      packageName,
      packageJsonObject,
      packageInfo,
    })

    if (includeImports && "imports" in packageJsonObject) {
      const importsForPackageImports = visitPackageImports({
        logger,
        packageFileUrl,
        packageName,
        packageJsonObject,
        packageInfo,
      })

      const { packageIsRoot, packageDirectoryRelativeUrl } = packageInfo
      Object.keys(importsForPackageImports).forEach((from) => {
        const to = importsForPackageImports[from]

        if (packageIsRoot) {
          addImportMapping({ from, to })
        } else {
          const toScoped =
            to[0] === "/"
              ? to
              : `./${packageDirectoryRelativeUrl}${to.startsWith("./") ? to.slice(2) : to}`

          addScopedImportMapping({
            scope: `./${packageDirectoryRelativeUrl}`,
            from,
            to: toScoped,
          })

          // when a package says './' maps to './'
          // we must add something to say if we are already inside the package
          // no need to ensure leading slash are scoped to the package
          if (from === "./" && to === "./") {
            addScopedImportMapping({
              scope: `./${packageDirectoryRelativeUrl}`,
              from: `./${packageDirectoryRelativeUrl}`,
              to: `./${packageDirectoryRelativeUrl}`,
            })
          } else if (from === "/" && to === "/") {
            addScopedImportMapping({
              scope: `./${packageDirectoryRelativeUrl}`,
              from: `./${packageDirectoryRelativeUrl}`,
              to: `./${packageDirectoryRelativeUrl}`,
            })
          }
        }
      })
    }

    if (selfImport) {
      const { packageIsRoot, packageDirectoryRelativeUrl } = packageInfo

      // allow import 'package-name/dir/file.js' in package-name files
      if (packageIsRoot) {
        addImportMapping({
          from: `${packageName}/`,
          to: `./${packageDirectoryRelativeUrl}`,
        })
      }
      // scoped allow import 'package-name/dir/file.js' in package-name files
      else {
        addScopedImportMapping({
          scope: `./${packageDirectoryRelativeUrl}`,
          from: `${packageName}/`,
          to: `./${packageDirectoryRelativeUrl}`,
        })
      }
    }

    if (includeExports && "exports" in packageJsonObject) {
      const importsForPackageExports = visitPackageExports({
        logger,
        packageFileUrl,
        packageName,
        packageJsonObject,
        packageInfo,
        favoredExports,
      })

      const {
        importerIsRoot,
        importerRelativeUrl,
        packageIsRoot,
        packageDirectoryRelativeUrl,
        // packageDirectoryUrl,
        // packageDirectoryUrlExpected,
      } = packageInfo

      if (packageIsRoot && selfImport) {
        Object.keys(importsForPackageExports).forEach((from) => {
          const to = importsForPackageExports[from]
          addImportMapping({
            from,
            to,
          })
        })
      } else if (packageIsRoot) {
        // ignore exports
      } else {
        Object.keys(importsForPackageExports).forEach((from) => {
          const to = importsForPackageExports[from]

          // own package exports available to himself
          if (importerIsRoot) {
            // importer is the package himself, keep exports scoped
            // otherwise the dependency exports would override the package exports.
            if (importerPackageJsonObject.name === packageName) {
              addScopedImportMapping({
                scope: `./${packageDirectoryRelativeUrl}`,
                from,
                to,
              })
              if (from === packageName || from in imports === false) {
                addImportMapping({ from, to })
              }
            } else {
              addImportMapping({ from, to })
            }
          } else {
            addScopedImportMapping({
              scope: `./${packageDirectoryRelativeUrl}`,
              from,
              to,
            })
          }

          // now make package exports available to the importer
          // if importer is root no need because the top level remapping does it
          if (importerIsRoot) {
            return
          }

          // now make it available to the importer
          // here if the importer is himself we could do stuff
          // we should even handle the case earlier to prevent top level remapping
          addScopedImportMapping({ scope: `./${importerRelativeUrl}`, from, to })
        })
      }
    }
  }

  const visitPackageMain = async ({
    packageFileUrl,
    packageName,
    packageJsonObject,
    packageInfo: {
      importerIsRoot,
      importerRelativeUrl,
      packageIsRoot,
      packageIsProject,
      packageDirectoryUrl,
      packageDirectoryUrlExpected,
    },
  }) => {
    if (packageIsRoot) return
    if (packageIsProject) return

    const mainFileUrl = await resolvePackageMain({
      packageFileUrl,
      packageJsonObject,
      logger,
    })

    // it's possible to have no main
    // like { main: "" } in package.json
    // or a main that does not lead to an actual file
    if (mainFileUrl === null) return

    const mainFileRelativeUrl = urlToRelativeUrl(mainFileUrl, rootProjectDirectoryUrl)
    const from = packageName
    const to = `./${mainFileRelativeUrl}`

    if (importerIsRoot) {
      addImportMapping({ from, to })
    } else {
      addScopedImportMapping({ scope: `./${importerRelativeUrl}`, from, to })
    }
    if (packageDirectoryUrl !== packageDirectoryUrlExpected) {
      addScopedImportMapping({ scope: `./${importerRelativeUrl}`, from, to })
    }
  }

  const visitDependencies = async ({
    packageFileUrl,
    packageJsonObject,
    includeDevDependencies,
  }) => {
    const dependencyMap = {}

    const { dependencies = {} } = packageJsonObject
    Object.keys(dependencies).forEach((dependencyName) => {
      dependencyMap[dependencyName] = {
        type: "dependency",
        versionPattern: dependencies[dependencyName],
      }
    })

    const { peerDependencies = {} } = packageJsonObject
    Object.keys(peerDependencies).forEach((dependencyName) => {
      dependencyMap[dependencyName] = {
        type: "peerDependency",
        versionPattern: peerDependencies[dependencyName],
      }
    })

    const isProjectPackage = packageFileUrl === projectPackageFileUrl
    if (includeDevDependencies && isProjectPackage) {
      const { devDependencies = {} } = packageJsonObject
      Object.keys(devDependencies).forEach((dependencyName) => {
        if (!dependencyMap.hasOwnProperty(dependencyName)) {
          dependencyMap[dependencyName] = {
            type: "devDependency",
            versionPattern: devDependencies[dependencyName],
          }
        }
      })
    }

    await Promise.all(
      Object.keys(dependencyMap).map(async (dependencyName) => {
        const dependency = dependencyMap[dependencyName]
        await visitDependency({
          packageFileUrl,
          packageJsonObject,
          dependencyName,
          dependencyType: dependency.type,
          dependencyVersionPattern: dependency.versionPattern,
        })
      }),
    )
  }

  const visitDependency = async ({
    packageFileUrl,
    packageJsonObject,
    dependencyName,
    dependencyType,
    dependencyVersionPattern,
  }) => {
    const dependencyData = await findDependency({
      packageFileUrl,
      packageJsonObject,
      dependencyName,
      dependencyType,
      dependencyVersionPattern,
    })
    if (!dependencyData) {
      return
    }

    const {
      packageFileUrl: dependencyPackageFileUrl,
      packageJsonObject: dependencyPackageJsonObject,
    } = dependencyData

    if (packageIsSeen(dependencyPackageFileUrl, packageFileUrl)) {
      return
    }
    markPackageAsSeen(dependencyPackageFileUrl, packageFileUrl)
    await visit({
      packageFileUrl: dependencyPackageFileUrl,
      packageName: dependencyName,
      packageJsonObject: dependencyPackageJsonObject,
      importerPackageFileUrl: packageFileUrl,
      importerPackageJsonObject: packageJsonObject,
    })
  }

  const computePackageInfo = ({ packageFileUrl, packageName, importerPackageFileUrl }) => {
    const importerIsRoot = importerPackageFileUrl === rootProjectPackageFileUrl

    const importerIsProject = importerPackageFileUrl === projectPackageFileUrl

    const importerPackageDirectoryUrl = resolveUrl("./", importerPackageFileUrl)

    const importerRelativeUrl = importerIsRoot
      ? `${basename(rootProjectDirectoryUrl)}/`
      : urlToRelativeUrl(importerPackageDirectoryUrl, rootProjectDirectoryUrl)

    const packageIsRoot = packageFileUrl === rootProjectPackageFileUrl

    const packageIsProject = packageFileUrl === projectPackageFileUrl

    const packageDirectoryUrl = resolveUrl("./", packageFileUrl)

    let packageDirectoryUrlExpected
    if (packageIsProject && !packageIsRoot) {
      packageDirectoryUrlExpected = importerPackageDirectoryUrl
    } else {
      packageDirectoryUrlExpected = `${importerPackageDirectoryUrl}node_modules/${packageName}/`
    }

    const packageDirectoryRelativeUrl = urlToRelativeUrl(
      packageDirectoryUrl,
      rootProjectDirectoryUrl,
    )

    return {
      importerIsRoot,
      importerIsProject,
      importerRelativeUrl,
      packageIsRoot,
      packageIsProject,
      packageDirectoryUrl,
      packageDirectoryUrlExpected,
      packageDirectoryRelativeUrl,
    }
  }

  const addImportMapping = ({ from, to }) => {
    // we could think it's useless to remap from with to
    // however it can be used to ensure a weaker remapping
    // does not win over this specific file or folder
    if (from === to) {
      /**
       * however remapping '/' to '/' is truly useless
       * moreover it would make wrapImportMap create something like
       * {
       *   imports: {
       *     "/": "/.dist/best/"
       *   }
       * }
       * that would append the wrapped folder twice
       * */
      if (from === "/") return
    }

    imports[from] = to
  }

  const addScopedImportMapping = ({ scope, from, to }) => {
    scopes[scope] = {
      ...(scopes[scope] || {}),
      [from]: to,
    }
  }

  const dependenciesCache = {}
  const findDependency = ({
    packageFileUrl,
    packageJsonObject,
    dependencyName,
    dependencyType,
    dependencyVersionPattern,
  }) => {
    if (packageFileUrl in dependenciesCache === false) {
      dependenciesCache[packageFileUrl] = {}
    }
    if (dependencyName in dependenciesCache[packageFileUrl]) {
      return dependenciesCache[packageFileUrl][dependencyName]
    }
    const dependencyPromise = resolveNodeModule({
      rootProjectDirectoryUrl,
      manualOverrides,
      packageFileUrl,
      packageJsonObject,
      dependencyName,
      dependencyType,
      dependencyVersionPattern,
      logger,
    })
    dependenciesCache[packageFileUrl][dependencyName] = dependencyPromise
    return dependencyPromise
  }

  const projectPackageJsonObject = await readPackageFile(projectPackageFileUrl, manualOverrides)

  const packageFileUrl = projectPackageFileUrl
  const importerPackageFileUrl = projectPackageFileUrl
  markPackageAsSeen(packageFileUrl, importerPackageFileUrl)

  const packageName = projectPackageJsonObject.name
  if (typeof packageName === "string") {
    await visit({
      packageFileUrl,
      packageName: projectPackageJsonObject.name,
      packageJsonObject: projectPackageJsonObject,
      importerPackageFileUrl,
      importerPackageJsonObject: null,
      includeDevDependencies,
    })
  } else {
    logger.warn(`package name field must be a string
--- package name field ---
${packageName}
--- package.json file path ---
${packageFileUrl}`)
  }

  // remove useless duplicates (scoped key+value already defined on imports)
  Object.keys(scopes).forEach((key) => {
    const scopedImports = scopes[key]
    Object.keys(scopedImports).forEach((scopedImportKey) => {
      if (
        scopedImportKey in imports &&
        imports[scopedImportKey] === scopedImports[scopedImportKey]
      ) {
        delete scopedImports[scopedImportKey]
      }
    })
    if (Object.keys(scopedImports).length === 0) {
      delete scopes[key]
    }
  })

  return sortImportMap({ imports, scopes })
}
