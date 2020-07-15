import { createLogger } from "@jsenv/logger"
import {
  resolveUrl,
  urlToFileSystemPath,
  assertAndNormalizeDirectoryUrl,
  writeFile,
  catchCancellation,
  createCancellationTokenForProcess,
} from "@jsenv/util"
import { importMapToVsCodeConfigPaths } from "./internal/importMapToVsCodeConfigPaths.js"
import { generateImportMapForPackage } from "./generateImportMapForPackage.js"

export const generateImportMapForProjectPackage = async ({
  // nothing is actually listening for this cancellationToken for now
  // it's not very important but it would be better to register on it
  // an stops what we are doing if asked to do so
  cancellationToken = createCancellationTokenForProcess(),
  logLevel,
  projectDirectoryUrl,

  manualOverrides,
  includeDevDependencies = process.env.NODE_ENV !== "production",
  includeExports = true,
  favoredExports,
  includeImports = true, // mot yet standard, shuuld be false by default
  selfImport = false, // not standard, something that may happen one day
  importMapFile = false,
  importMapFileRelativeUrl = "./import-map.importmap",
  importMapFileLog = true,
  jsConfigFile = false,
  jsConfigFileLog = true,
  jsConfigLeadingSlash = false,
  updateProcessExitCode = true,
}) =>
  catchCancellation(async () => {
    projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl)

    const logger = createLogger({ logLevel })
    const importMap = await generateImportMapForPackage({
      cancellationToken,
      logger,

      projectDirectoryUrl,
      manualOverrides,
      includeDevDependencies,
      includeExports,
      includeImports,
      favoredExports,
      selfImport,
    })

    if (importMapFile) {
      const importMapFileUrl = resolveUrl(importMapFileRelativeUrl, projectDirectoryUrl)
      await writeFile(importMapFileUrl, JSON.stringify(importMap, null, "  "))
      if (importMapFileLog) {
        logger.info(`-> ${urlToFileSystemPath(importMapFileUrl)}`)
      }
    }
    if (jsConfigFile) {
      const jsConfigFileUrl = resolveUrl("./jsconfig.json", projectDirectoryUrl)
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
        await writeFile(jsConfigFileUrl, JSON.stringify(jsConfig, null, "  "))
        if (jsConfigFileLog) {
          logger.info(`-> ${urlToFileSystemPath(jsConfigFileUrl)}`)
        }
      } catch (e) {
        if (e.code !== "ENOENT") {
          throw e
        }
      }
    }

    return importMap
  }).catch((e) => {
    // this is required to ensure unhandledRejection will still
    // set process.exitCode to 1 marking the process execution as errored
    // preventing further command to run
    if (updateProcessExitCode) {
      process.exitCode = 1
    }
    throw e
  })
