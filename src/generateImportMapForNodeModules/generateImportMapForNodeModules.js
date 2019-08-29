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
  remapDevDependencies = true,
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
    const visit = async ({ packagePathname, packageData, name }) => {
      if (packagePathname in seen) return
      seen[packagePathname] = true

      const isProjectPackage = packagePathname === projectPackagePathname
      const isRootPackage = packagePathname === rootPackagePathname

      const importerName = isRootPackage
        ? rootImporterName
        : pathnameToDirname(pathnameToRelativePathname(packagePathname, rootProjectPathname)).slice(
            1,
          )

      if (isRootPackage) {
      } else {
        const dependencyActualPathname = pathnameToDirname(packagePathname)
        const dependencyActualRelativePath = pathnameToRelativePathname(
          dependencyActualPathname,
          rootProjectPathname,
        )
        const dependencyExpectedPathname = `${pathnameToDirname(
          packagePathname,
        )}/node_modules/${name}`
        const dependencyExpectedRelativePath = pathnameToRelativePathname(
          dependencyExpectedPathname,
          rootProjectPathname,
        )
        const moved = dependencyActualRelativePath !== dependencyExpectedRelativePath
        const main = await resolvePackageMain({
          packageData,
          packagePathname,
          onWarn: () => {},
        })

        if (main) {
          const from = name
          const to = `${dependencyActualRelativePath}/${main}`

          addMapping({ importerName, from, to })
          if (moved) {
            addScopedImportMapping({ scope: `/${importerName}/`, from, to })
          }
        }

        if ("imports" in packageData) {
          // ensure imports remains scoped to the package
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
              from: `${dependencyExpectedRelativePath}/`,
              to: `${dependencyActualRelativePath}/`,
            })
          }

          Object.keys(packageData.imports).forEach((key) => {
            const resolvedKey = resolvePathInPackage(key, packagePathname)
            if (!resolvedKey) return
            const resolvedValue = resolvePathInPackage(
              packageData.expoimportsrts[key],
              packagePathname,
            )
            if (!resolvedValue) return
            const from = `${name}${resolvedKey}`
            const to = `${dependencyActualRelativePath}${resolvedValue}`

            addScopedImportMapping({
              scope: `${dependencyActualRelativePath}/`,
              from,
              to,
            })
          })
        }

        if ("exports" in packageData) {
          Object.keys(packageData.exports).forEach((key) => {
            const resolvedKey = resolvePathInPackage(key, packagePathname)
            if (!resolvedKey) return
            const resolvedValue = resolvePathInPackage(packageData.exports[key], packagePathname)
            if (!resolvedValue) return
            const from = `${name}${resolvedKey}`
            const to = `${dependencyActualRelativePath}${resolvedValue}`

            addMapping({
              importerName,
              from,
              to,
            })
            if (moved) {
              addScopedImportMapping({
                scope: `/${importerName}/`,
                from,
                to,
              })
            }
          })
        }
      }

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

          await visit({
            packagePathname: dependencyPackagePathname,
            packageData: dependencyPackageData,
            name: dependencyName,
          })
        }),
      )
    }

    const resolvePathInPackage = (path, packagePathname) => {
      if (path[0] === "/") return path
      if (path.slice(0, 2) === "./") return path.slice(1)
      onWarn({
        code: "INVALID_PATH_RELATIVE_TO_PACKAGE",
        message: `invalid path, got ${path}`,
        data: { path, packagePathname },
      })
      return ""
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
