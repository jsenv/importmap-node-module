import { composeTwoImportMaps } from "@jsenv/import-map"
import {
  operatingSystemPathToPathname,
  pathnameToOperatingSystemPath,
} from "@jsenv/operating-system-path"
import { fileWrite } from "@dmail/helper"
import { catchAsyncFunctionCancellation } from "@dmail/cancellation"
import { createNodeModulesImportMapGenerator } from "../createNodeModulesImportMapGenerator.js"
import { importMapToVsCodeConfigPaths } from "./importMapToVsCodeConfigPaths.js"

export const generateImportMapForNodeModules = async ({
  projectPath,
  rootProjectPath,
  importMapRelativePath = "/importMap.json",
  inputImportMap,
  includeDevDependencies,
  onWarn,
  writeImportMapFile = false,
  logImportMapFilePath = true,
  throwUnhandled = true,
  writeJsConfigFile = false,
  logJsConfigFilePath = true,
}) =>
  catchAsyncFunctionCancellation(async () => {
    const start = async () => {
      const generator = createNodeModulesImportMapGenerator({
        projectPath,
        rootProjectPath,
        onWarn,
      })
      const nodeModuleImportMap = await generator.generateProjectImportMap({
        includeDevDependencies,
      })
      const importMap = inputImportMap
        ? composeTwoImportMaps(inputImportMap, nodeModuleImportMap)
        : nodeModuleImportMap

      if (writeImportMapFile) {
        const projectPathname = operatingSystemPathToPathname(projectPath)
        const importMapPath = pathnameToOperatingSystemPath(
          `${projectPathname}${importMapRelativePath}`,
        )
        await fileWrite(importMapPath, JSON.stringify(importMap, null, "  "))
        if (logImportMapFilePath) {
          console.log(`-> ${importMapPath}`)
        }
      }
      if (writeJsConfigFile) {
        const projectPathname = operatingSystemPathToPathname(projectPath)
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
