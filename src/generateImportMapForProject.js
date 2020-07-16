import { createLogger } from "@jsenv/logger"
import {
  resolveUrl,
  readFile,
  urlToFileSystemPath,
  assertAndNormalizeDirectoryUrl,
  writeFile,
  wrapExternalFunction,
  createCancellationTokenForProcess,
} from "@jsenv/util"
import { composeTwoImportMaps } from "@jsenv/import-map"
import { importMapToVsCodeConfigPaths } from "./internal/importMapToVsCodeConfigPaths.js"
import { generateImportMapForNodeModules } from "./generateImportMapForNodeModules.js"

export const generateImportMapForProject = async ({
  // nothing is actually listening for this cancellationToken for now
  // it's not very important but it would be better to register on it
  // an stops what we are doing if asked to do so
  cancellationToken = createCancellationTokenForProcess(),
  logLevel,
  projectDirectoryUrl,

  projectPackageDevDependenciesIncluded = process.env.NODE_ENV !== "production",
  // pass ['browser', 'default'] to read browser first then 'default' if defined
  // in package exports field
  packagesExportsPreference = ["import", "node", "require"],
  packagesManualOverrides,
  // imports, exports and self import are now inside Node.js
  // there are enabled by default
  packagesExportsIncluded = true,
  packagesSelfImport = true,
  // (however Node.js spec about package imports talks about #, not sure we behave correctly
  // regarding those)
  packagesImportsIncluded = true,

  customImportMapFileIncluded = false,
  customImportMapFileRelativeUrl = "./import-map-custom.importmap",

  importMapFile = true,
  importMapFileRelativeUrl = "./import-map.importmap",
  importMapFileLog = true,

  jsConfigFile = false,
  jsConfigFileLog = true,
  jsConfigLeadingSlash = false,
}) =>
  wrapExternalFunction(
    async () => {
      projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl)

      const logger = createLogger({ logLevel })

      const getImportMapFromNodeModules = () =>
        generateImportMapForNodeModules({
          cancellationToken,
          logLevel,

          projectDirectoryUrl,
          packagesManualOverrides,
          projectPackageDevDependenciesIncluded,
          packagesImportsIncluded,
          packagesExportsIncluded,
          packagesExportsPreference,
          packagesSelfImport,
        })

      const getImportMapFromCustomFile = async () => {
        if (typeof customImportMapFileRelativeUrl !== "string") {
          throw new Error(
            `customImportMapFileRelativeUrl must be a string, received ${customImportMapFileRelativeUrl}`,
          )
        }
        const importMapCustomFileUrl = resolveUrl(
          customImportMapFileRelativeUrl,
          projectDirectoryUrl,
        )
        const importMapCustom = JSON.parse(await readFile(importMapCustomFileUrl))
        return importMapCustom
      }

      const importMaps = await Promise.all([
        getImportMapFromNodeModules(),
        ...(customImportMapFileIncluded ? [getImportMapFromCustomFile()] : []),
      ])

      const importMap = importMaps.reduce((previous, current) => {
        return composeTwoImportMaps(previous, current)
      }, {})

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
    },
    { catchCancellation: true, unhandledRejectionStrict: false },
  )
