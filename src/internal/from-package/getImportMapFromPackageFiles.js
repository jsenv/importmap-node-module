import { createLogger, createDetailedMessage } from "@jsenv/logger"
import {
  resolveUrl,
  urlToRelativeUrl,
  assertAndNormalizeDirectoryUrl,
  urlToFileSystemPath,
  urlToBasename,
  readFile,
} from "@jsenv/util"
import { resolvePackageMain } from "./resolvePackageMain.js"
import { visitPackageExports } from "./visitPackageExports.js"
import { createFindNodeModulePackage } from "./node-module-resolution.js"
// import { visitPackageImportMap } from "./visitPackageImportmap.js"

export const getImportMapFromPackageFiles = async ({
  // nothing is actually listening for this cancellationToken for now
  // it's not very important but it would be better to register on it
  // an stops what we are doing if asked to do so
  // cancellationToken = createCancellationTokenForProcess(),
  logLevel,
  projectDirectoryUrl,
  projectPackageDevDependenciesIncluded = process.env.NODE_ENV !== "production",
  packagesExportsPreference = ["import", "browser"],
  packagesExportsIncluded = true,
  packagesSelfReference = true,
  packagesManualOverrides = {},
  packageIncludedPredicate = () => true,
}) => {
  const logger = createLogger({ logLevel })

  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl)

  const projectPackageFileUrl = resolveUrl("./package.json", projectDirectoryUrl)
  const findNodeModulePackage = createFindNodeModulePackage(packagesManualOverrides)

  const imports = {}
  const scopes = {}
  const addTopLevelImportMapping = ({ from, to }) => {
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
    if (!packageIncludedPredicate({ packageName, packageFileUrl, packageJsonObject })) {
      return
    }

    await visitDependencies({
      packageFileUrl,
      packageJsonObject,
      includeDevDependencies,
    })
    await visitPackage({
      packageFileUrl,
      packageName,
      packageJsonObject,
      importerPackageFileUrl,
      importerPackageJsonObject,
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

    // const importsForPackageImportmap = await visitPackageImportMap({
    //   logger,
    //   packageFileUrl,
    //   packageJsonObject,
    //   projectDirectoryUrl,
    // })

    if (packagesSelfReference) {
      const { packageIsRoot, packageDirectoryRelativeUrl } = packageInfo

      // allow import 'package-name/dir/file.js' in package-name files
      if (packageIsRoot) {
        addTopLevelImportMapping({
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

    if (packagesExportsIncluded && "exports" in packageJsonObject) {
      const importsForPackageExports = {}
      visitPackageExports({
        packageFileUrl,
        packageJsonObject,
        packageName,
        projectDirectoryUrl,
        packagesExportsPreference,
        onExport: ({ key, value }) => {
          const from = key
          const to = value

          if (from.indexOf("*") === -1) {
            importsForPackageExports[from] = to
            return
          }

          if (
            from.endsWith("/*") &&
            to.endsWith("/*") &&
            // ensure ends with '*' AND there is only one '*' occurence
            to.indexOf("*") === to.length - 1
          ) {
            const fromWithouTrailingStar = from.slice(0, -1)
            const toWithoutTrailingStar = to.slice(0, -1)
            importsForPackageExports[fromWithouTrailingStar] = toWithoutTrailingStar
            return
          }

          logger.warn(
            formatWilcardExportsIgnoredWarning({
              key,
              value,
              packageFileUrl,
            }),
          )
        },
        onWarn: (warning) => {
          logger.warn(`
      ${warning}
      `)
        },
      })

      const {
        importerIsRoot,
        importerRelativeUrl,
        packageIsRoot,
        packageDirectoryRelativeUrl,
        // packageDirectoryUrl,
        // packageDirectoryUrlExpected,
      } = packageInfo

      if (packageIsRoot && packagesSelfReference) {
        Object.keys(importsForPackageExports).forEach((from) => {
          const to = importsForPackageExports[from]
          addTopLevelImportMapping({
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
                addTopLevelImportMapping({ from, to })
              }
            } else {
              addTopLevelImportMapping({ from, to })
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
      packageDirectoryUrl,
      packageDirectoryUrlExpected,
    },
  }) => {
    const self = packageIsRoot
    if (self && !packagesSelfReference) {
      return
    }

    const mainFileUrl = await resolvePackageMain({
      packageFileUrl,
      packageJsonObject,
      logger,
    })

    // it's possible to have no main
    // like { main: "" } in package.json
    // or a main that does not lead to an actual file
    if (mainFileUrl === null) return

    const mainFileRelativeUrl = urlToRelativeUrl(mainFileUrl, projectDirectoryUrl)
    const from = packageName
    const to = `./${mainFileRelativeUrl}`

    if (importerIsRoot) {
      addTopLevelImportMapping({ from, to })
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
    const dependencyMap = packageDependenciesFromPackageObject(packageJsonObject, {
      includeDevDependencies,
    })

    await Promise.all(
      Object.keys(dependencyMap).map(async (dependencyName) => {
        const dependencyInfo = dependencyMap[dependencyName]
        await visitDependency({
          packageFileUrl,
          packageJsonObject,
          dependencyName,
          dependencyInfo,
        })
      }),
    )
  }

  const visitDependency = async ({
    packageFileUrl,
    packageJsonObject,
    dependencyName,
    dependencyInfo,
  }) => {
    const dependencyData = await findDependency({
      packageFileUrl,
      dependencyName,
    })
    if (!dependencyData) {
      logger[dependencyInfo.isOptional ? "debug" : "warn"](
        formatCannotFindPackageLog({
          dependencyName,
          dependencyInfo,
          packageFileUrl,
        }),
      )

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
    const importerIsRoot = importerPackageFileUrl === projectPackageFileUrl

    const importerPackageDirectoryUrl = resolveUrl("./", importerPackageFileUrl)

    const importerRelativeUrl = importerIsRoot
      ? `${urlToBasename(projectDirectoryUrl.slice(0, -1))}/`
      : urlToRelativeUrl(importerPackageDirectoryUrl, projectDirectoryUrl)

    const packageIsRoot = packageFileUrl === projectPackageFileUrl

    const packageDirectoryUrl = resolveUrl("./", packageFileUrl)

    const packageDirectoryUrlExpected = `${importerPackageDirectoryUrl}node_modules/${packageName}/`

    const packageDirectoryRelativeUrl = urlToRelativeUrl(packageDirectoryUrl, projectDirectoryUrl)

    return {
      importerIsRoot,
      importerRelativeUrl,
      packageIsRoot,
      packageDirectoryUrl,
      packageDirectoryUrlExpected,
      packageDirectoryRelativeUrl,
    }
  }

  const dependenciesCache = {}
  const findDependency = ({ packageFileUrl, dependencyName }) => {
    if (packageFileUrl in dependenciesCache === false) {
      dependenciesCache[packageFileUrl] = {}
    }
    if (dependencyName in dependenciesCache[packageFileUrl]) {
      return dependenciesCache[packageFileUrl][dependencyName]
    }
    const dependencyPromise = findNodeModulePackage({
      projectDirectoryUrl,
      packageFileUrl,
      dependencyName,
    })
    dependenciesCache[packageFileUrl][dependencyName] = dependencyPromise
    return dependencyPromise
  }

  const projectPackageJsonObject = await readFile(projectPackageFileUrl, { as: "json" })
  const importerPackageFileUrl = projectPackageFileUrl
  markPackageAsSeen(projectPackageFileUrl, importerPackageFileUrl)

  const packageName = projectPackageJsonObject.name
  if (typeof packageName !== "string") {
    logger.warn(
      formatUnexpectedPackageNameLog({ packageName, packageFileUrl: projectPackageFileUrl }),
    )
    return {}
  }

  await visit({
    packageFileUrl: projectPackageFileUrl,
    packageName: projectPackageJsonObject.name,
    packageJsonObject: projectPackageJsonObject,
    importerPackageFileUrl,
    importerPackageJsonObject: null,
    includeDevDependencies: projectPackageDevDependenciesIncluded,
  })

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

  return { imports, scopes }
}

const packageDependenciesFromPackageObject = (packageObject, { includeDevDependencies }) => {
  const packageDependencies = {}

  const { dependencies = {} } = packageObject
  // https://npm.github.io/using-pkgs-docs/package-json/types/optionaldependencies.html
  const { optionalDependencies = {} } = packageObject
  Object.keys(dependencies).forEach((dependencyName) => {
    packageDependencies[dependencyName] = {
      type: "dependency",
      isOptional: dependencyName in optionalDependencies,
      versionPattern: dependencies[dependencyName],
    }
  })

  const { peerDependencies = {} } = packageObject
  const { peerDependenciesMeta = {} } = packageObject
  Object.keys(peerDependencies).forEach((dependencyName) => {
    packageDependencies[dependencyName] = {
      type: "peerDependency",
      versionPattern: peerDependencies[dependencyName],
      isOptional:
        dependencyName in peerDependenciesMeta && peerDependenciesMeta[dependencyName].optional,
    }
  })

  if (includeDevDependencies) {
    const { devDependencies = {} } = packageObject
    Object.keys(devDependencies).forEach((dependencyName) => {
      if (!packageDependencies.hasOwnProperty(dependencyName)) {
        packageDependencies[dependencyName] = {
          type: "devDependency",
          versionPattern: devDependencies[dependencyName],
        }
      }
    })
  }

  return packageDependencies
}

const formatWilcardExportsIgnoredWarning = ({ key, value, packageFileUrl }) => {
  return `Ignoring export using "*" because it is not supported by importmap.
--- key ---
${key}
--- value ---
${value}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}
--- see also ---
https://github.com/WICG/import-maps/issues/232`
}

const formatUnexpectedPackageNameLog = ({ packageName, packageFileUrl }) => {
  return `
package name field must be a string
--- package name field ---
${packageName}
--- package.json file path ---
${packageFileUrl}
`
}

const formatCannotFindPackageLog = ({ dependencyName, dependencyInfo, packageFileUrl }) => {
  const dependencyIsOptional = dependencyInfo.isOptional
  const dependencyType = dependencyInfo.type
  const dependencyVersionPattern = dependencyInfo.versionPattern
  const detailedMessage = createDetailedMessage(
    dependencyIsOptional
      ? `cannot find an optional ${dependencyType}.`
      : `cannot find a ${dependencyType}.`,
    {
      [dependencyType]: `${dependencyName}@${dependencyVersionPattern}`,
      "required by": urlToFileSystemPath(packageFileUrl),
    },
  )
  return `
${detailedMessage}
`
}
