import { createLogger } from "@jsenv/logger"
import { composeTwoImportMaps } from "@jsenv/import-map"
import { fileWrite } from "@dmail/helper"
import { catchAsyncFunctionCancellation } from "@dmail/cancellation"
import { pathToDirectoryUrl, resolveFileUrl, fileUrlToPath } from "../urlHelpers.js"
import { generateImportMapForPackage } from "../generateImportMapForPackage/generateImportMapForPackage.js"
import { importMapToVsCodeConfigPaths } from "./importMapToVsCodeConfigPaths.js"

export const generateImportMapForProjectPackage = async ({
  logLevel,
  projectDirectoryPath,
  inputImportMap,
  includeDevDependencies,
  throwUnhandled = true,
  importMapFile = false,
  importMapFileRelativePath = "./importMap.json",
  importMapFileLog = true,
  jsConfigFile = false,
  jsConfigFileLog = true,
  jsConfigLeadingSlash = false,
}) =>
  catchAsyncFunctionCancellation(async () => {
    const start = async () => {
      const logger = createLogger({ logLevel })
      const projectPackageImportMap = await generateImportMapForPackage({
        projectDirectoryPath,
        includeDevDependencies,
        logger,
      })
      const importMap = inputImportMap
        ? composeTwoImportMaps(inputImportMap, projectPackageImportMap)
        : projectPackageImportMap

      if (importMapFile) {
        const projectDirectoryUrl = pathToDirectoryUrl(projectDirectoryPath)
        const importMapFileUrl = resolveFileUrl(importMapFileRelativePath, projectDirectoryUrl)
        const importMapFilePath = fileUrlToPath(importMapFileUrl)
        await fileWrite(importMapFilePath, JSON.stringify(importMap, null, "  "))
        if (importMapFileLog) {
          logger.info(`-> ${importMapFilePath}`)
        }
      }
      if (jsConfigFile) {
        const projectDirectoryUrl = pathToDirectoryUrl(projectDirectoryPath)
        const jsConfigFileUrl = resolveFileUrl("./jsconfig.json", projectDirectoryUrl)
        const jsConfigFilePath = fileUrlToPath(jsConfigFileUrl)
        try {
          const jsConfig = {
            compilerOptions: {
              baseUrl: ".",
              paths: {
                ...(jsConfigLeadingSlash ? { "/*": ["./*"] } : {}),
                ...importMapToVsCodeConfigPaths(importMap),
              },
            },
          }
          await fileWrite(jsConfigFilePath, JSON.stringify(jsConfig, null, "  "))
          if (jsConfigFileLog) {
            logger.info(`-> ${jsConfigFilePath}`)
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
