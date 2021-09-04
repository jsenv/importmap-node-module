import { createLogger } from "@jsenv/logger"
import {
  assertAndNormalizeDirectoryUrl,
  writeFile,
  resolveUrl,
  readFile,
  urlToFileSystemPath,
} from "@jsenv/filesystem"
import { sortImportMap } from "@jsenv/importmap"

import { visitNodeModuleResolution } from "./internal/from-package/visitNodeModuleResolution.js"
import { optimizeImportMap } from "./internal/optimizeImportMap.js"
import { visitSourceFiles } from "./internal/from-js/visitSourceFiles.js"
import { importMapToVsCodeConfigPaths } from "./internal/importMapToVsCodeConfigPaths.js"

export const writeImportMapFiles = async ({
  logLevel,
  projectDirectoryUrl,
  importMapFiles,
  packagesManualOverrides,
  onWarn = (warning, warn) => {
    warn(warning)
  },
  writeFiles = true,
}) => {
  const logger = createLogger({ logLevel })
  const warn = wrapWarnToWarnOnce((warning) => {
    onWarn(warning, () => {
      logger.warn(`\n${warning.message}\n`)
    })
  })

  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl)

  if (typeof importMapFiles !== "object" || importMapFiles === null) {
    throw new TypeError(
      `importMapFiles must be an object, received ${importMapFiles}`,
    )
  }
  const importMapFileRelativeUrls = Object.keys(importMapFiles)
  const importMapFileCount = importMapFileRelativeUrls.length
  if (importMapFileCount.length) {
    throw new Error(`importMapFiles object is empty`)
  }

  const importMaps = {}
  const nodeResolutionVisitors = []
  importMapFileRelativeUrls.forEach((importMapFileRelativeUrl) => {
    const importMapConfig = importMapFiles[importMapFileRelativeUrl]

    const { initialImportMap = {} } = importMapConfig
    const topLevelMappings = initialImportMap.imports || {}
    const scopedMappings = initialImportMap.scopes || {}
    const importMap = {
      imports: topLevelMappings,
      scopes: scopedMappings,
    }
    importMaps[importMapFileRelativeUrl] = importMap

    const {
      mappingsForNodeResolution,
      mappingsForDevDependencies,
      nodeResolutionConditions,
      packageIncludedPredicate,
    } = importMapConfig
    if (mappingsForNodeResolution) {
      nodeResolutionVisitors.push({
        mappingsForDevDependencies,
        nodeResolutionConditions,
        packageIncludedPredicate,
        onMapping: ({ scope, from, to }) => {
          if (scope) {
            scopedMappings[scope] = {
              ...(scopedMappings[scope] || {}),
              [from]: to,
            }
          } else {
            topLevelMappings[from] = to
          }
        },
      })
    }
  })

  if (nodeResolutionVisitors.length > 0) {
    await visitNodeModuleResolution({
      logger,
      warn,
      projectDirectoryUrl,
      visitors: nodeResolutionVisitors,
      packagesManualOverrides,
    })
  }

  await importMapFileRelativeUrls.reduce(
    async (previous, importMapFileRelativeUrl) => {
      const importMapConfig = importMapFiles[importMapFileRelativeUrl]
      const { mappingsTreeshaking, ignoreJsFiles } = importMapConfig
      if (!ignoreJsFiles) {
        const importMap = await visitSourceFiles({
          logger,
          warn,
          projectDirectoryUrl,
          importMap: importMaps[importMapFileRelativeUrl],
          mappingsTreeshaking,
        })
        importMaps[importMapFileRelativeUrl] = importMap
      }
    },
    Promise.resolve(),
  )

  Object.keys(importMaps).forEach((key) => {
    const importMap = importMaps[key]
    const importMapNormalized = sortImportMap(optimizeImportMap(importMap))
    importMaps[key] = importMapNormalized
  })

  if (writeFiles) {
    await importMapFileRelativeUrls.reduce(
      async (previous, importMapFileRelativeUrl) => {
        await previous
        const importmapFileUrl = resolveUrl(
          importMapFileRelativeUrl,
          projectDirectoryUrl,
        )
        const importMap = importMaps[importMapFileRelativeUrl]
        await writeFile(importmapFileUrl, JSON.stringify(importMap, null, "  "))
      },
      Promise.resolve(),
    )
  }

  const firstUpdatingJsConfig = importMapFileRelativeUrls.find(
    (importMapFileRelativeUrl) => {
      const importMapFileConfig = importMapFiles[importMapFileRelativeUrl]
      return importMapFileConfig.useForJsConfigJSON
    },
  )
  if (firstUpdatingJsConfig) {
    const jsConfigFileUrl = resolveUrl("./jsconfig.json", projectDirectoryUrl)
    const jsConfigCurrent = (await readCurrentJsConfig(jsConfigFileUrl)) || {
      compilerOptions: {},
    }
    const importMapUsedForVsCode = importMaps[firstUpdatingJsConfig]
    const jsConfig = {
      ...jsConfigDefault,
      ...jsConfigCurrent,
      compilerOptions: {
        ...jsConfigDefault.compilerOptions,
        ...jsConfigCurrent.compilerOptions,
        // importmap is the source of truth -> paths are overwritten
        // We coudldn't differentiate which one we created and which one where added manually anyway
        paths: importMapToVsCodeConfigPaths(importMapUsedForVsCode),
      },
    }
    await writeFile(jsConfigFileUrl, JSON.stringify(jsConfig, null, "  "))
    logger.info(`-> ${urlToFileSystemPath(jsConfigFileUrl)}`)
  }

  return importMaps
}

const wrapWarnToWarnOnce = (warn) => {
  const warnings = []
  return (warning) => {
    const alreadyWarned = warnings.some((warningCandidate) => {
      return JSON.stringify(warningCandidate) === JSON.stringify(warning)
    })
    if (alreadyWarned) {
      return
    }

    if (warnings.length > 1000) {
      warnings.shift()
    }
    warnings.push(warning)
    warn(warning)
  }
}

const jsConfigDefault = {
  compilerOptions: {
    baseUrl: ".",
    paths: {},
  },
}

const readCurrentJsConfig = async (jsConfigFileUrl) => {
  try {
    const currentJSConfig = await readFile(jsConfigFileUrl, { as: "json" })
    return currentJSConfig
  } catch (e) {
    return null
  }
}
