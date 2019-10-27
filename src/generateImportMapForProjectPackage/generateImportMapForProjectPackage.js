import { pathToFileURL, fileURLToPath } from "url"
import { createLogger } from "@jsenv/logger"
import { composeTwoImportMaps } from "@jsenv/import-map"
import { fileWrite } from "@dmail/helper"
import { catchAsyncFunctionCancellation } from "@dmail/cancellation"
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
        const projectDirectoryUrl = pathToFileURL(projectDirectoryPath)
        const importMapFileUrl = new URL(importMapFileRelativePath, projectDirectoryUrl)
        const importMapFilePath = fileURLToPath(importMapFileUrl)
        await fileWrite(importMapFilePath, JSON.stringify(importMap, null, "  "))
        if (importMapFileLog) {
          logger.info(`-> ${importMapFilePath}`)
        }
      }
      if (jsConfigFile) {
        const projectDirectoryUrl = pathToFileURL(projectDirectoryPath)
        const jsConfigFileUrl = new URL("./jsconfig.json", projectDirectoryUrl)
        const jsConfigFilePath = fileURLToPath(jsConfigFileUrl)
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
