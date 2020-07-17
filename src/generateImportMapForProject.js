import {
  resolveUrl,
  urlToFileSystemPath,
  assertAndNormalizeDirectoryUrl,
  writeFile,
  wrapExternalFunction,
} from "@jsenv/util"
import { composeTwoImportMaps } from "@jsenv/import-map"
import { importMapToVsCodeConfigPaths } from "./internal/importMapToVsCodeConfigPaths.js"

export const generateImportMapForProject = async (
  importMapInputs = [],
  {
    projectDirectoryUrl,

    importMapFile = true, // in case someone wants the importmap but not write it on filesystem
    importMapFileRelativeUrl = "./import-map.importmap",
    importMapFileLog = true,

    jsConfigFile = false, // not yet documented, makes vscode aware of the import remapping
    jsConfigFileLog = true,
    jsConfigLeadingSlash = false,
  },
) =>
  wrapExternalFunction(
    async () => {
      projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl)

      if (importMapInputs.length === 0) {
        console.warn(`importMapInputs is empty, the generated importmap will be empty`)
      }

      const importMaps = await Promise.all(importMapInputs)

      const importMap = importMaps.reduce((previous, current) => {
        return composeTwoImportMaps(previous, current)
      }, {})

      if (importMapFile) {
        const importMapFileUrl = resolveUrl(importMapFileRelativeUrl, projectDirectoryUrl)
        await writeFile(importMapFileUrl, JSON.stringify(importMap, null, "  "))
        if (importMapFileLog) {
          console.info(`-> ${urlToFileSystemPath(importMapFileUrl)}`)
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
            console.info(`-> ${urlToFileSystemPath(jsConfigFileUrl)}`)
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
