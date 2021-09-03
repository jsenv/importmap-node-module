import {
  resolveUrl,
  urlToFileSystemPath,
  assertAndNormalizeDirectoryUrl,
  writeFile,
  readFile,
} from "@jsenv/filesystem"
import { composeTwoImportMaps } from "@jsenv/importmap"

import { importMapToVsCodeConfigPaths } from "./internal/importMapToVsCodeConfigPaths.js"

export const writeImportMapFile = async (
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
) => {
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
    const jsConfigCurrent = (await readCurrentJsConfig(jsConfigFileUrl)) || { compilerOptions: {} }
    const jsConfig = {
      ...jsConfigDefault,
      ...jsConfigCurrent,
      compilerOptions: {
        ...jsConfigDefault.compilerOptions,
        ...jsConfigCurrent.compilerOptions,
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
  }

  return importMap
}

const readCurrentJsConfig = async (jsConfigFileUrl) => {
  try {
    const currentJSConfig = await readFile(jsConfigFileUrl, { as: "json" })
    return currentJSConfig
  } catch (e) {
    return null
  }
}

const jsConfigDefault = {
  compilerOptions: {
    baseUrl: ".",
    paths: {},
  },
}
