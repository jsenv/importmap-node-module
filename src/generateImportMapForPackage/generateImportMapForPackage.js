/* eslint-disable import/max-dependencies */
import { basename } from "path"
import { pathToFileURL, fileURLToPath } from "url"
import { sortImportMap } from "@jsenv/import-map"
import { readPackageData } from "./readPackageData.js"
import { resolveNodeModule } from "./resolveNodeModule.js"
import { resolvePackageMain } from "./resolvePackageMain.js"
import { visitPackageImports } from "./visitPackageImports.js"
import { visitPackageExports } from "./visitPackageExports.js"

export const generateImportMapForPackage = async ({
  projectDirectoryPath,
  rootProjectDirectoryPath = projectDirectoryPath,
  includeDevDependencies = false,
  logger,
}) => {
  const projectDirectoryUrl = directoryPathToDirectoryUrl(projectDirectoryPath)
  const rootProjectDirectoryUrl = directoryPathToDirectoryUrl(rootProjectDirectoryPath)
  const rootImporterName = basename(rootProjectDirectoryUrl)
  const projectPackageFileUrl = resolveFileUrl("./package.json", projectDirectoryUrl)
  const rootProjectPackageFileUrl = resolveFileUrl("./package.json", rootProjectDirectoryUrl)

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
    packageData,
    includeDevDependencies,
    packageName,
    importerPackageFileUrl,
  }) => {
    await visitPackage({
      packageFileUrl,
      packageData,
      packageName,
      importerPackageFileUrl,
    })
    await visitDependencies({
      packageFileUrl,
      packageData,
      includeDevDependencies,
    })
  }

  const visitPackage = async ({
    packageFileUrl,
    packageData,
    packageName,
    importerPackageFileUrl,
  }) => {
    const packageInfo = computePackageInfo({
      packageFileUrl,
      packageName,
      importerPackageFileUrl,
    })

    await visitPackageMain({
      packageFileUrl,
      packageName,
      packageData,
      packageInfo,
    })

    if ("imports" in packageData) {
      const importsForPackageImports = visitPackageImports({
        packageFileUrl,
        packageName,
        packageData,
        packageInfo,
      })

      const { packageIsRoot, packageDirectoryRelativePath } = packageInfo
      Object.keys(importsForPackageImports).forEach((from) => {
        const to = importsForPackageImports[from]

        if (packageIsRoot) {
          addImportMapping({ from, to })
        } else {
          const toScoped =
            to[0] === "/"
              ? to
              : `${packageDirectoryRelativePath}${to.startsWith("./") ? to.slice(2) : to}`

          addScopedImportMapping({
            scope: packageDirectoryRelativePath,
            from,
            to: toScoped,
          })

          // when a package says './' maps to './'
          // we must add something to say if we are already inside the package
          // no need to ensure leading slash are scoped to the package
          if (from === "./" && to === "./") {
            addScopedImportMapping({
              scope: packageDirectoryRelativePath,
              from: packageDirectoryRelativePath,
              to: packageDirectoryRelativePath,
            })
          } else if (from === "/" && to === "/") {
            addScopedImportMapping({
              scope: packageDirectoryRelativePath,
              from: packageDirectoryRelativePath,
              to: packageDirectoryRelativePath,
            })
          }
        }
      })
    }

    if ("exports" in packageData) {
      const importsForPackageExports = visitPackageExports({
        packageFileUrl,
        packageName,
        packageData,
        packageInfo,
      })

      const { importerName, packageDirectoryUrl, packageDirectoryUrlExpected } = packageInfo
      Object.keys(importsForPackageExports).forEach((from) => {
        const to = importsForPackageExports[from]

        if (importerName === rootImporterName) {
          addImportMapping({ from, to })
        } else {
          addScopedImportMapping({ scope: `./${importerName}/`, from, to })
        }
        if (packageDirectoryUrl !== packageDirectoryUrlExpected) {
          addScopedImportMapping({
            scope: `./${importerName}/`,
            from,
            to,
          })
        }
      })
    }
  }

  const visitPackageMain = async ({
    packageFileUrl,
    packageData,
    packageName,
    packageInfo: {
      packageIsRoot,
      packageIsProject,
      importerPackageIsRoot,
      importerName,
      packageDirectoryUrl,
      packageDirectoryUrlExpected,
      packageDirectoryRelativePath,
    },
  }) => {
    if (packageIsRoot) return
    if (packageIsProject) return

    const mainFileUrl = await resolvePackageMain({
      packageFileUrl,
      packageData,
      logger,
    })

    // it's possible to have no main
    // like { main: "" } in package.json
    // or a main that does not lead to an actual file
    if (mainFileUrl === null) return

    const mainFileRelativePath = mainFileUrl.slice(packageDirectoryUrl.length)

    const from = packageName
    const to = `${packageDirectoryRelativePath}${mainFileRelativePath}`

    if (importerPackageIsRoot) {
      addImportMapping({ from, to })
    } else {
      addScopedImportMapping({ scope: `./${importerName}/`, from, to })
    }
    if (packageDirectoryUrl !== packageDirectoryUrlExpected) {
      addScopedImportMapping({ scope: `./${importerName}/`, from, to })
    }
  }

  const visitDependencies = async ({ packageFileUrl, packageData, includeDevDependencies }) => {
    const dependencyMap = {}

    const { dependencies = {} } = packageData
    Object.keys(dependencies).forEach((dependencyName) => {
      dependencyMap[dependencyName] = {
        type: "dependency",
        versionPattern: dependencies[dependencyName],
      }
    })

    const { peerDependencies = {} } = packageData
    Object.keys(peerDependencies).forEach((dependencyName) => {
      dependencyMap[dependencyName] = {
        type: "peerDependency",
        versionPattern: peerDependencies[dependencyName],
      }
    })

    const isProjectPackage = packageFileUrl === projectPackageFileUrl
    if (includeDevDependencies && isProjectPackage) {
      const { devDependencies = {} } = packageData
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
          packageData,
          dependencyName,
          dependencyType: dependency.type,
          dependencyVersionPattern: dependency.versionPattern,
        })
      }),
    )
  }

  const visitDependency = async ({
    packageFileUrl,
    packageData,
    dependencyName,
    dependencyType,
    dependencyVersionPattern,
  }) => {
    const dependencyData = await findDependency({
      packageFileUrl,
      packageData,
      dependencyName,
      dependencyType,
      dependencyVersionPattern,
    })
    if (!dependencyData) {
      return
    }

    const {
      packageFileUrl: dependencyPackageFileUrl,
      packageData: dependencyPackageData,
    } = dependencyData

    if (packageIsSeen(dependencyPackageFileUrl, packageFileUrl)) {
      return
    }
    markPackageAsSeen(dependencyPackageFileUrl, packageFileUrl)
    await visit({
      packageFileUrl: dependencyPackageFileUrl,
      packageData: dependencyPackageData,
      packageName: dependencyName,
      importerPackageFileUrl: packageFileUrl,
    })
  }

  const computePackageInfo = ({ packageFileUrl, packageName, importerPackageFileUrl }) => {
    const packageIsRoot = packageFileUrl === rootProjectPackageFileUrl

    const importerPackageIsRoot = importerPackageFileUrl === rootProjectPackageFileUrl

    const packageIsProject = packageFileUrl === projectPackageFileUrl

    const importerPackageIsProject = importerPackageFileUrl === projectPackageFileUrl

    const packageDirectoryUrl = resolveDirectoryUrl("./", packageFileUrl)

    const importerPackageDirectoryUrl = resolveDirectoryUrl("./", importerPackageFileUrl)

    const importerName = importerPackageIsRoot
      ? rootImporterName
      : importerPackageDirectoryUrl.slice(rootProjectDirectoryUrl.length)

    let packageDirectoryUrlExpected
    if (packageIsProject && !packageIsRoot) {
      packageDirectoryUrlExpected = importerPackageDirectoryUrl
    } else {
      packageDirectoryUrlExpected = `${importerPackageDirectoryUrl}node_modules/${packageName}`
    }

    const packageDirectoryRelativePath = `./${packageDirectoryUrl.slice(
      rootProjectDirectoryUrl.length,
    )}`

    return {
      importerPackageIsRoot,
      importerPackageIsProject,
      importerPackageDirectoryUrl,
      importerName,
      packageIsRoot,
      packageIsProject,
      packageDirectoryUrl,
      packageDirectoryUrlExpected,
      packageDirectoryRelativePath,
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
    packageData,
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
      packageFileUrl,
      packageData,
      dependencyName,
      dependencyType,
      dependencyVersionPattern,
      logger,
    })
    dependenciesCache[packageFileUrl][dependencyName] = dependencyPromise
    return dependencyPromise
  }

  const projectPackageData = await readPackageData({
    path: fileURLToPath(projectPackageFileUrl),
  })

  const packageFileUrl = projectPackageFileUrl
  const importerPackageFileUrl = projectPackageFileUrl
  markPackageAsSeen(packageFileUrl, importerPackageFileUrl)
  await visit({
    packageFileUrl,
    packageData: projectPackageData,
    includeDevDependencies,
    packageName: projectPackageData.name,
    importerPackageFileUrl,
  })

  return sortImportMap({ imports, scopes })
}

const resolveFileUrl = (specifier, baseUrl) => {
  return String(new URL(specifier, baseUrl))
}

const resolveDirectoryUrl = (specifier, baseUrl) => {
  const directoryUrl = String(new URL(specifier, baseUrl))
  if (directoryUrl.endsWith("/")) {
    return directoryUrl
  }
  return `${directoryUrl}/`
}

const directoryPathToDirectoryUrl = (path) => {
  const directoryUrl = String(pathToFileURL(path))
  if (directoryUrl.endsWith("/")) {
    return directoryUrl
  }
  return `${directoryUrl}/`
}
