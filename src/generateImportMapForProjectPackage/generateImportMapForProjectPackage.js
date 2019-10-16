import { composeTwoImportMaps } from "@jsenv/import-map"
import {
  operatingSystemPathToPathname,
  pathnameToOperatingSystemPath,
} from "@jsenv/operating-system-path"
import { createLogger } from "@jsenv/logger"
import { fileWrite } from "@dmail/helper"
import { catchAsyncFunctionCancellation } from "@dmail/cancellation"
import { generateImportMapForPackage } from "../generateImportMapForPackage/generateImportMapForPackage.js"
import { importMapToVsCodeConfigPaths } from "./importMapToVsCodeConfigPaths.js"

export const generateImportMapForProjectPackage = async ({
  projectPath,
  inputImportMap,
  includeDevDependencies,
  logLevel,
  throwUnhandled = true,
  importMapFile = false,
  importMapFileRelativePath = "/importMap.json",
  importMapFileLog = true,
  jsConfigFile = false,
  jsConfigFileLog = true,
}) =>
  catchAsyncFunctionCancellation(async () => {
    const start = async () => {
      const logger = createLogger({ logLevel })
      const projectPackageImportMap = await generateImportMapForPackage({
        projectPath,
        includeDevDependencies,
        logger,
      })
      const importMap = inputImportMap
        ? composeTwoImportMaps(inputImportMap, projectPackageImportMap)
        : projectPackageImportMap

      if (importMapFile) {
        const projectPathname = operatingSystemPathToPathname(projectPath)
        const importMapPath = pathnameToOperatingSystemPath(
          `${projectPathname}${importMapFileRelativePath}`,
        )
        await fileWrite(importMapPath, JSON.stringify(importMap, null, "  "))
        if (importMapFileLog) {
          logger.info(`-> ${importMapPath}`)
        }
      }
      if (jsConfigFile) {
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
          if (jsConfigFileLog) {
            logger.info(`-> ${jsConfigPath}`)
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
