import { writeFile } from "fs"
import { createLogger } from "@jsenv/logger"
import { composeTwoImportMaps } from "@jsenv/import-map"
import { catchAsyncFunctionCancellation } from "@jsenv/cancellation"
import { pathToDirectoryUrl, resolveUrl, fileUrlToPath } from "./internal/urlHelpers.js"
import { importMapToVsCodeConfigPaths } from "./internal/importMapToVsCodeConfigPaths.js"
import { generateImportMapForPackage } from "./generateImportMapForPackage.js"

export const generateImportMapForProjectPackage = async ({
  logLevel,
  projectDirectoryPath,
  inputImportMap,
  includeDevDependencies,
  includeExports = false,
  packageExportCondition,
  includeImports = false,
  importMapFile = false,
  importMapFileRelativeUrl = "./importMap.json",
  importMapFileLog = true,
  jsConfigFile = false,
  jsConfigFileLog = true,
  jsConfigLeadingSlash = false,
}) =>
  catchAsyncFunctionCancellation(async () => {
    const logger = createLogger({ logLevel })
    const projectPackageImportMap = await generateImportMapForPackage({
      projectDirectoryPath,
      includeDevDependencies,
      includeExports,
      includeImports,
      packageExportCondition,
      logger,
    })
    const importMap = inputImportMap
      ? composeTwoImportMaps(inputImportMap, projectPackageImportMap)
      : projectPackageImportMap

    if (importMapFile) {
      const projectDirectoryUrl = pathToDirectoryUrl(projectDirectoryPath)
      const importMapFileUrl = resolveUrl(importMapFileRelativeUrl, projectDirectoryUrl)
      const importMapFilePath = fileUrlToPath(importMapFileUrl)
      await writeFileContent(importMapFilePath, JSON.stringify(importMap, null, "  "))
      if (importMapFileLog) {
        logger.info(`-> ${importMapFilePath}`)
      }
    }
    if (jsConfigFile) {
      const projectDirectoryUrl = pathToDirectoryUrl(projectDirectoryPath)
      const jsConfigFileUrl = resolveUrl("./jsconfig.json", projectDirectoryUrl)
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
        await writeFileContent(jsConfigFilePath, JSON.stringify(jsConfig, null, "  "))
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
  })

const writeFileContent = (path, content) =>
  new Promise((resolve, reject) => {
    writeFile(path, content, (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
