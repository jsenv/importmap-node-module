import { basename } from "path"
import {
  operatingSystemPathToPathname,
  pathnameToRelativePathname,
  pathnameToOperatingSystemPath,
} from "@jsenv/operating-system-path"
import { pathnameToDirname } from "@jsenv/module-resolution"
import { fileWrite } from "@dmail/helper"
import { catchAsyncFunctionCancellation } from "@dmail/cancellation"
import { mergeTwoImportMap } from "../mergeTwoImportMap/mergeTwoImportMap.js"
import {
  resolveNodeModule,
  readPackageData,
  resolvePackageMain,
} from "./node-module-resolution/index.js"
import { sortImportMap } from "./sortImportMap.js"
import { importMapToVsCodeConfigPaths } from "./importMapToVsCodeConfigPaths.js"

export const generateImportMapForNodeModules = async ({
  projectPath,
  rootProjectPath = projectPath,
  importMapRelativePath = "/importMap.json",
  inputImportMap = {},
  remapMain = true, // import 'lodash' remapped to '/node_modules/lodash/index.js'
  remapFolder = true, // import 'lodash/src/file.js' remapped to '/node_modules/lodash/src/file.js'
  scopeOriginRelativePerModule = false, // import '/folder/file.js' is scoped per node_module
  remapDevDependencies = false,
  remapPredicate = () => true,
  onWarn = ({ message }) => {
    console.warn(message)
  },
  writeImportMapFile = false,
  logImportMapFilePath = true,
  throwUnhandled = true,
  writeJsConfigFile = false,
  logJsConfigFilePath = true,
}) =>
  catchAsyncFunctionCancellation(async () => {
    const projectPathname = operatingSystemPathToPathname(projectPath)
    const projectPackagePathname = `${projectPathname}/package.json`

    const rootProjectPathname = operatingSystemPathToPathname(rootProjectPath)
    const rootImporterName = basename(pathnameToDirname(rootProjectPathname))
    const rootPackagePathname = `${rootProjectPathname}/package.json`

    const imports = {}
    const scopes = {}

    const start = async () => {
      const projectPackageData = await readPackageData({
        path: pathnameToOperatingSystemPath(projectPackagePathname),
        onWarn,
      })
      await visit({
        packagePathname: projectPackagePathname,
        packageData: projectPackageData,
      })
      const nodeModuleImportMap = { imports, scopes }
      const importMap = mergeTwoImportMap(inputImportMap, nodeModuleImportMap)
      const sortedImportMap = sortImportMap(importMap)

      if (writeImportMapFile) {
        const importMapPath = pathnameToOperatingSystemPath(
          `${projectPathname}${importMapRelativePath}`,
        )
        await fileWrite(importMapPath, JSON.stringify(sortedImportMap, null, "  "))
        if (logImportMapFilePath) {
          console.log(`-> ${importMapPath}`)
        }
      }
      if (writeJsConfigFile) {
        const jsConfigPath = pathnameToOperatingSystemPath(`${projectPathname}/jsconfig.json`)
        try {
          const jsConfig = {
            compilerOptions: {
              baseUrl: ".",
              paths: {
                "/*": ["./*"],
                ...importMapToVsCodeConfigPaths(importMap),
              },
            },
          }
          await fileWrite(jsConfigPath, JSON.stringify(jsConfig, null, "  "))
          if (logJsConfigFilePath) {
            console.log(`-> ${jsConfigPath}`)
          }
        } catch (e) {
          if (e.code !== "ENOENT") {
            throw e
          }
        }
      }

      return sortedImportMap
    }

    const seen = {}
    const visit = async ({ packagePathname, packageData }) => {
      if (packagePathname in seen) return
      seen[packagePathname] = true

      const isProjectPackage = packagePathname === projectPackagePathname
      const isRootPackage = packagePathname === rootPackagePathname

      const importerName = isRootPackage
        ? rootImporterName
        : pathnameToDirname(pathnameToRelativePathname(packagePathname, rootProjectPathname)).slice(
            1,
          )
      const { dependencies = {}, peerDependencies = {}, devDependencies = {} } = packageData

      const dependencyMap = {}
      Object.keys(dependencies).forEach((dependencyName) => {
        dependencyMap[dependencyName] = {
          type: "dependency",
          versionPattern: dependencies[dependencyName],
        }
      })
      Object.keys(peerDependencies).forEach((dependencyName) => {
        dependencyMap[dependencyName] = {
          type: "peerDependency",
          versionPattern: peerDependencies[dependencyName],
        }
      })
      if (remapDevDependencies && isProjectPackage) {
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

          if (
            !remapPredicate({
              importerName,
              isProjectPackage,
              isRootPackage,
              dependencyName,
              dependencyType: dependency.type,
              dependencyVersionPattern: dependency.versionPattern,
              packageData,
            })
          ) {
            return
          }

          const dependencyData = await findDependency({
            packagePathname,
            packageData,
            dependencyName,
            dependencyType: dependency.type,
            dependencyVersionPattern: dependency.versionPattern,
          })
          if (!dependencyData) {
            return
          }

          const {
            packagePathname: dependencyPackagePathname,
            packageData: dependencyPackageData,
          } = dependencyData

          const dependencyActualPathname = pathnameToDirname(dependencyPackagePathname)
          const dependencyActualRelativePath = pathnameToRelativePathname(
            dependencyActualPathname,
            rootProjectPathname,
          )
          const dependencyExpectedPathname = `${pathnameToDirname(
            packagePathname,
          )}/node_modules/${dependencyName}`
          const dependencyExpectedRelativePath = pathnameToRelativePathname(
            dependencyExpectedPathname,
            rootProjectPathname,
          )
          const moved = dependencyActualRelativePath !== dependencyExpectedRelativePath

          if (remapFolder) {
            const from = `${dependencyName}/`
            const to = `${dependencyActualRelativePath}/`

            addMapping({ importerName, from, to })
            if (moved) {
              addScopedImportMapping({ scope: `/${importerName}/`, from, to })
            }
          }

          if (remapMain) {
            const dependencyMain = await resolvePackageMain({
              packageData: dependencyPackageData,
              packagePathname: dependencyPackagePathname,
              onWarn: () => {},
            })
            if (!dependencyMain) return
            const from = dependencyName
            const to = `${dependencyActualRelativePath}/${dependencyMain}`

            addMapping({ importerName, from, to })
            if (moved) {
              addScopedImportMapping({ scope: `/${importerName}/`, from, to })
            }
          }

          if (scopeOriginRelativePerModule) {
            addScopedImportMapping({
              scope: `${dependencyActualRelativePath}/`,
              from: `/`,
              to: `${dependencyActualRelativePath}/`,
            })
            addScopedImportMapping({
              scope: `${dependencyActualRelativePath}/`,
              from: `${dependencyActualRelativePath}/`,
              to: `${dependencyActualRelativePath}/`,
            })

            if (moved) {
              addScopedImportMapping({
                scope: `/${importerName}/`,
                from: `${dependencyExpectedRelativePath}/`,
                to: `${dependencyActualRelativePath}/`,
              })
              addScopedImportMapping({
                scope: `/${importerName}/`,
                from: `${dependencyActualRelativePath}/`,
                to: `${dependencyActualRelativePath}/`,
              })
            } else {
              addScopedImportMapping({
                scope: `${dependencyExpectedRelativePath}/`,
                from: `/`,
                to: `${dependencyActualRelativePath}/`,
              })
              addScopedImportMapping({
                scope: `${dependencyExpectedRelativePath}/`,
                from: `${dependencyExpectedRelativePath}/`,
                to: `${dependencyActualRelativePath}/`,
              })
            }
          }

          await visit({
            packagePathname: dependencyPackagePathname,
            packageData: dependencyPackageData,
          })
        }),
      )
    }

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
      if (importerName === rootImporterName) {
        addImportMapping({ from, to })
      } else {
        addScopedImportMapping({ scope: `/${importerName}/`, from, to })
      }
    }

    const dependenciesCache = {}
    const findDependency = ({
      packagePathname,
      packageData,
      dependencyName,
      dependencyType,
      dependencyVersionPattern,
    }) => {
      if (packagePathname in dependenciesCache === false) {
        dependenciesCache[packagePathname] = {}
      }
      if (dependencyName in dependenciesCache[packagePathname]) {
        return dependenciesCache[packagePathname][dependencyName]
      }
      const dependencyPromise = resolveNodeModule({
        rootPathname: rootProjectPathname,
        packagePathname,
        packageData,
        dependencyName,
        dependencyType,
        dependencyVersionPattern,
        onWarn,
      })
      dependenciesCache[packagePathname][dependencyName] = dependencyPromise
      return dependencyPromise
    }

    const promise = start()
    if (!throwUnhandled) return promise
    return promise.catch((e) => {
      setTimeout(() => {
        throw e
      })
    })
  })
