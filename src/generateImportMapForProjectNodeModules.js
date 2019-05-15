import { basename } from "path"
import { normalizePathname, pathnameToDirname } from "@jsenv/module-resolution"
import { fileWrite } from "@dmail/helper"
import { catchAsyncFunctionCancellation } from "./catchAsyncFunctionCancellation.js"
import { readPackageData } from "./readPackageData.js"
import { resolveNodeModule } from "./resolveNodeModule.js"
import { packageDataToMain } from "./packageDataToMain.js"
import { packageMayNeedRemapping } from "./packageMayNeedRemapping.js"
import { GENERATE_IMPORT_MAP_DEFAULT_IMPORT_MAP_FILENAME_RELATIVE } from "./generate-import-map-constant.js"

export const generateImportMapForProjectNodeModules = async ({
  projectFolder,
  importMapFilenameRelative = GENERATE_IMPORT_MAP_DEFAULT_IMPORT_MAP_FILENAME_RELATIVE,
  scopeOriginRelativePerModule = true, // import '/folder/file.js' is scoped per node_module
  remapMain = true, // import 'lodash' remapped to '/node_modules/lodash/index.js'
  remapFolder = true, // import 'lodash/src/file.js' remapped to '/node_modules/lodash/src/file.js'
  remapDevDependencies = true,
  remapPredicate = () => true,
  writeImportMapFile = true,
  logImportMapFilePath = true,
  throwUnhandled = true,
}) =>
  catchAsyncFunctionCancellation(async () => {
    projectFolder = normalizePathname(projectFolder)
    const topLevelPackageFilename = `${projectFolder}/package.json`
    const topLevelImporterName = basename(pathnameToDirname(topLevelPackageFilename))

    const dependenciesCache = {}
    const findDependency = ({ importerFilename, nodeModuleName }) => {
      if (importerFilename in dependenciesCache === false) {
        dependenciesCache[importerFilename] = {}
      }
      if (nodeModuleName in dependenciesCache[importerFilename]) {
        return dependenciesCache[importerFilename][nodeModuleName]
      }

      const dependencyPromise = resolveNodeModule({
        rootFolder: projectFolder,
        importerFilename,
        nodeModuleName,
      })
      dependenciesCache[importerFilename][nodeModuleName] = dependencyPromise
      return dependencyPromise
    }

    const imports = {}
    const scopes = {}

    const addImportMapping = ({ from, to }) => {
      imports[from] = to
    }

    const addScopedImportMapping = ({ scope, from, to }) => {
      scopes[scope] = {
        ...(scopes[scope] || {}),
        [from]: to,
      }
    }

    const addMapping = ({ importerName, from, to }) => {
      if (importerName === topLevelImporterName) {
        addImportMapping({ from, to })
      } else {
        addScopedImportMapping({ scope: `/${importerName}/`, from, to })
      }
    }

    const visit = async ({ packageFilename, packageData }) => {
      const isTopLevel = packageFilename === topLevelPackageFilename

      if (!isTopLevel && !packageMayNeedRemapping(packageData)) return

      const importerName = isTopLevel
        ? topLevelImporterName
        : pathnameToDirname(packageFilename.slice(`${projectFolder}/`.length))
      const { dependencies = {}, devDependencies = {} } = packageData

      const arrayOfDependencyToRemap = Object.keys({
        ...dependencies,
        ...(remapDevDependencies && isTopLevel ? devDependencies : {}),
      }).filter((dependencyName) =>
        remapPredicate({
          importerName,
          isTopLevel,
          dependencyName,
          isDev: dependencyName in devDependencies,
        }),
      )

      await Promise.all(
        arrayOfDependencyToRemap.map(async (dependencyName) => {
          const dependency = await findDependency({
            importerFilename: packageFilename,
            nodeModuleName: dependencyName,
          })
          if (!dependency) {
            throw new Error(
              createNodeModuleNotFoundMessage({
                projectFolder,
                importerFilename: packageFilename,
                nodeModuleName: dependencyName,
              }),
            )
          }

          const {
            packageData: dependencyPackageData,
            packageFilename: dependencyPackageFilename,
          } = dependency

          const dependencyActualFolder = pathnameToDirname(dependencyPackageFilename)
          const dependencyActualPathname = dependencyActualFolder.slice(projectFolder.length)
          const dependencyExpectedFolder = `${pathnameToDirname(
            packageFilename,
          )}/node_modules/${dependencyName}`
          const dependencyExpectedPathname = dependencyExpectedFolder.slice(projectFolder.length)
          const moved = dependencyActualPathname !== dependencyExpectedPathname

          if (remapFolder) {
            const from = `${dependencyName}/`
            const to = `${dependencyActualPathname}/`

            addMapping({ importerName, from, to })
            if (moved) {
              addScopedImportMapping({ scope: `/${importerName}/`, from, to })
            }
          }

          if (remapMain) {
            const dependencyMain = packageDataToMain(
              dependencyPackageData,
              dependencyPackageFilename,
            )
            const from = dependencyName
            const to = `${dependencyActualPathname}/${dependencyMain}`

            addMapping({ importerName, from, to })
            if (moved) {
              addScopedImportMapping({ scope: `/${importerName}/`, from, to })
            }
          }

          if (scopeOriginRelativePerModule) {
            addScopedImportMapping({
              scope: `${dependencyExpectedPathname}/`,
              from: `${dependencyExpectedPathname}/`,
              to: `${dependencyActualPathname}/`,
            })
            addScopedImportMapping({
              scope: `${dependencyExpectedPathname}/`,
              from: `/`,
              to: `${dependencyActualPathname}/`,
            })

            if (moved) {
              addScopedImportMapping({
                scope: `/${importerName}/`,
                from: `${dependencyExpectedPathname}/`,
                to: `${dependencyActualPathname}/`,
              })
              addScopedImportMapping({
                scope: `/${importerName}/`,
                from: `${dependencyActualPathname}/`,
                to: `${dependencyActualPathname}/`,
              })
            }
          }

          return visit({
            packageFilename: dependencyPackageFilename,
            packageData: dependencyPackageData,
          })
        }),
      )
    }

    const start = async () => {
      const topLevelPackageData = await readPackageData({ filename: topLevelPackageFilename })
      await visit({
        packageFilename: topLevelPackageFilename,
        packageData: topLevelPackageData,
      })
      const importMap = sortImportMap({ imports, scopes })
      if (writeImportMapFile) {
        const importMapFilename = `${projectFolder}/${importMapFilenameRelative}`
        await fileWrite(importMapFilename, JSON.stringify(importMap, null, "  "))
        if (logImportMapFilePath) {
          console.log(`-> ${importMapFilename}`)
        }
      }
      return importMap
    }

    const promise = start()
    if (!throwUnhandled) return promise
    return promise.catch((e) => {
      setTimeout(() => {
        throw e
      })
    })
  })

const sortImportMap = (importMap) => {
  const orderedImportMap = {
    imports: sortImportMapImports(importMap.imports),
    scopes: sortImportMapScopes(importMap.scopes),
  }
  return orderedImportMap
}

const sortImportMapImports = (imports) => {
  const sortedImports = {}
  Object.keys(imports)
    .sort(compareLengthOrLocaleCompare)
    .forEach((name) => {
      sortedImports[name] = imports[name]
    })
  return sortedImports
}

const compareLengthOrLocaleCompare = (a, b) => {
  return b.length - a.length || a.localeCompare(b)
}

const sortImportMapScopes = (scopes) => {
  const sortedScopes = {}
  Object.keys(scopes)
    .sort(compareLengthOrLocaleCompare)
    .forEach((scopeName) => {
      sortedScopes[scopeName] = sortScopedImports(scopes[scopeName], scopeName)
    })
  return sortedScopes
}

const sortScopedImports = (scopedImports) => {
  const compareScopedImport = (a, b) => {
    // const aIsRoot = a === "/"
    // const bIsRoot = b === "/"
    // if (aIsRoot && !bIsRoot) return 1
    // if (!aIsRoot && bIsRoot) return -1
    // if (aIsRoot && bIsRoot) return 0

    // const aIsScope = a === scope
    // const bIsScope = b === scope
    // if (aIsScope && !bIsScope) return 1
    // if (!aIsScope && bIsScope) return -1
    // if (aIsScope && bIsScope) return 0

    return compareLengthOrLocaleCompare(a, b)
  }

  const sortedScopedImports = {}
  Object.keys(scopedImports)
    .sort(compareScopedImport)
    .forEach((name) => {
      sortedScopedImports[name] = scopedImports[name]
    })
  return sortedScopedImports
}

const createNodeModuleNotFoundMessage = ({
  projectFolder,
  importerFilename,
  nodeModuleName,
}) => `node module not found.
projectFolder : ${projectFolder}
importerFilename: ${importerFilename}
nodeModuleName: ${nodeModuleName}`
