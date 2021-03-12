import { createDetailedMessage } from "@jsenv/logger"
import {
  resolveUrl,
  urlToRelativeUrl,
  assertAndNormalizeDirectoryUrl,
  urlToFileSystemPath,
  urlToBasename,
  readFile,
} from "@jsenv/util"
import { optimizeImportMap } from "../optimizeImportMap.js"
import { resolvePackageMain } from "./resolvePackageMain.js"
import { visitPackageImportMap } from "./visitPackageImportMap.js"
import { visitPackageExports } from "./visitPackageExports.js"
import { createFindNodeModulePackage } from "./node-module-resolution.js"

export const getImportMapFromPackageFiles = async ({
  // nothing is actually listening for this cancellationToken for now
  // it's not very important but it would be better to register on it
  // an stops what we are doing if asked to do so
  // cancellationToken = createCancellationTokenForProcess(),
  logger,
  warn,
  projectDirectoryUrl,
  projectPackageDevDependenciesIncluded = process.env.NODE_ENV !== "production",
  packagesExportsPreference = ["import", "browser"],
  packagesExportsIncluded = true,
  packagesManualOverrides = {},
  packageIncludedPredicate = () => true,
}) => {
  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl)

  const projectPackageFileUrl = resolveUrl("./package.json", projectDirectoryUrl)
  const findNodeModulePackage = createFindNodeModulePackage(packagesManualOverrides)

  const imports = {}
  const scopes = {}
  const addMapping = ({ scope, from, to }) => {
    if (scope) {
      // when a package says './' maps to './'
      // we must add something to say if we are already inside the package
      // no need to ensure leading slash are scoped to the package
      if (from === "./" && to === scope) {
        addMapping({
          scope,
          from: scope,
          to: scope,
        })
        const packageName = scope.slice(scope.lastIndexOf("node_modules/") + `node_modules/`.length)
        addMapping({
          scope,
          from: packageName,
          to: scope,
        })
      }

      scopes[scope] = {
        ...(scopes[scope] || {}),
        [from]: to,
      }
    } else {
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

    const {
      importerIsRoot,
      importerRelativeUrl,
      packageIsRoot,
      packageDirectoryRelativeUrl,
      // packageDirectoryUrl,
      // packageDirectoryUrlExpected,
    } = packageInfo

    const addImportMapForPackage = (importMap) => {
      if (packageIsRoot) {
        const { imports = {}, scopes = {} } = importMap
        Object.keys(imports).forEach((from) => {
          addMapping({
            from,
            to: imports[from],
          })
        })
        Object.keys(scopes).forEach((scope) => {
          const scopeMappings = scopes[scope]
          Object.keys(scopeMappings).forEach((key) => {
            addMapping({
              scope,
              from: key,
              to: scopeMappings[key],
            })
          })
        })
        return
      }

      const { imports = {}, scopes = {} } = importMap
      const scope = `./${packageDirectoryRelativeUrl}`
      Object.keys(imports).forEach((from) => {
        const to = imports[from]
        const toMoved = moveMappingValue(to, packageFileUrl, projectDirectoryUrl)
        addMapping({
          scope,
          from,
          to: toMoved,
        })
      })
      Object.keys(scopes).forEach((scope) => {
        const scopeMappings = scopes[scope]
        const scopeMoved = moveMappingValue(scope, packageFileUrl, projectDirectoryUrl)
        Object.keys(scopeMappings).forEach((key) => {
          const to = scopeMappings[key]
          const toMoved = moveMappingValue(to, packageFileUrl, projectDirectoryUrl)
          addMapping({
            scope: scopeMoved,
            from: key,
            to: toMoved,
          })
        })
      })
    }

    const addMappingsForPackageAndImporter = (mappings) => {
      if (packageIsRoot) {
        Object.keys(mappings).forEach((from) => {
          const to = mappings[from]
          addMapping({
            from,
            to,
          })
        })
        return
      }

      if (importerIsRoot) {
        // own package mappings available to himself
        Object.keys(mappings).forEach((from) => {
          const to = mappings[from]
          addMapping({
            scope: `./${packageDirectoryRelativeUrl}`,
            from,
            to,
          })
          addMapping({ from, to })
        })

        // if importer is root no need to make package mappings available to the importer
        // because they are already on top level mappings
        return
      }

      Object.keys(mappings).forEach((from) => {
        const to = mappings[from]
        // own package exports available to himself
        addMapping({
          scope: `./${packageDirectoryRelativeUrl}`,
          from,
          to,
        })
        // now make package exports available to the importer
        // here if the importer is himself we could do stuff
        // we should even handle the case earlier to prevent top level remapping
        addMapping({
          scope: `./${importerRelativeUrl}`,
          from,
          to,
        })
      })
    }

    const importsFromPackageField = await visitPackageImportMap({
      warn,
      packageFileUrl,
      packageJsonObject,
      projectDirectoryUrl,
    })
    addImportMapForPackage(importsFromPackageField)

    if (packagesExportsIncluded && "exports" in packageJsonObject) {
      const mappingsFromPackageExports = {}
      visitPackageExports({
        warn,
        packageFileUrl,
        packageJsonObject,
        packageName,
        projectDirectoryUrl,
        packagesExportsPreference,
        onExport: ({ key, value }) => {
          const from = key
          const to = value

          if (from.indexOf("*") === -1) {
            mappingsFromPackageExports[from] = to
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
            mappingsFromPackageExports[fromWithouTrailingStar] = toWithoutTrailingStar
            return
          }

          warn(
            createExportsWildcardIgnoredWarning({
              key,
              value,
              packageFileUrl,
            }),
          )
        },
      })
      addMappingsForPackageAndImporter(mappingsFromPackageExports)
    }
  }

  const visitPackageMain = async ({
    packageFileUrl,
    packageName,
    packageJsonObject,
    packageInfo: {
      importerIsRoot,
      importerRelativeUrl,
      packageDirectoryUrl,
      packageDirectoryUrlExpected,
    },
  }) => {
    const mainFileUrl = await resolvePackageMain({
      warn,
      packagesExportsPreference,
      packageFileUrl,
      packageJsonObject,
    })

    // it's possible to have no main
    // like { main: "" } in package.json
    // or a main that does not lead to an actual file
    if (mainFileUrl === null) {
      return
    }

    const mainFileRelativeUrl = urlToRelativeUrl(mainFileUrl, projectDirectoryUrl)
    const from = packageName
    const to = `./${mainFileRelativeUrl}`

    if (importerIsRoot) {
      addMapping({ from, to })
    } else {
      addMapping({
        scope: `./${importerRelativeUrl}`,
        from,
        to,
      })
    }
    if (packageDirectoryUrl !== packageDirectoryUrlExpected) {
      addMapping({
        scope: `./${importerRelativeUrl}`,
        from,
        to,
      })
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
      const cannotFindPackageWarning = createCannotFindPackageWarning({
        dependencyName,
        dependencyInfo,
        packageFileUrl,
      })
      if (dependencyInfo.isOptional) {
        logger.debug(cannotFindPackageWarning.message)
      } else {
        warn(cannotFindPackageWarning)
      }

      return
    }
    if (dependencyData.syntaxError) {
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

    const importerRelativeUrl = urlToRelativeUrl(importerPackageDirectoryUrl, projectDirectoryUrl)

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
    warn(
      createPackageNameMustBeAStringWarning({
        packageName,
        packageFileUrl: projectPackageFileUrl,
      }),
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

  return optimizeImportMap({ imports, scopes })
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

const moveMappingValue = (address, from, to) => {
  const url = resolveUrl(address, from)
  const relativeUrl = urlToRelativeUrl(url, to)
  if (relativeUrl.startsWith("../")) {
    return relativeUrl
  }
  if (relativeUrl.startsWith("./")) {
    return relativeUrl
  }
  if (/^[a-zA-Z]{2,}:/.test(relativeUrl)) {
    // has sheme
    return relativeUrl
  }
  return `./${relativeUrl}`
}

const createExportsWildcardIgnoredWarning = ({ key, value, packageFileUrl }) => {
  return {
    code: "EXPORTS_WILDCARD",
    message: `Ignoring export using "*" because it is not supported by importmap.
--- key ---
${key}
--- value ---
${value}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}
--- see also ---
https://github.com/WICG/import-maps/issues/232`,
  }
}

const createPackageNameMustBeAStringWarning = ({ packageName, packageFileUrl }) => {
  return {
    code: "PACKAGE_NAME_MUST_BE_A_STRING",
    message: `package name field must be a string
--- package name field ---
${packageName}
--- package.json file path ---
${packageFileUrl}`,
  }
}

const createCannotFindPackageWarning = ({ dependencyName, dependencyInfo, packageFileUrl }) => {
  const dependencyIsOptional = dependencyInfo.isOptional
  const dependencyType = dependencyInfo.type
  const dependencyVersionPattern = dependencyInfo.versionPattern
  return {
    code: "CANNOT_FIND_PACKAGE",
    message: createDetailedMessage(
      dependencyIsOptional
        ? `cannot find an optional ${dependencyType}.`
        : `cannot find a ${dependencyType}.`,
      {
        [dependencyType]: `${dependencyName}@${dependencyVersionPattern}`,
        "required by": urlToFileSystemPath(packageFileUrl),
      },
    ),
  }
}
