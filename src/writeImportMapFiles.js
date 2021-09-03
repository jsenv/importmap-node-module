import { createLogger } from "@jsenv/logger"
import {
  assertAndNormalizeDirectoryUrl,
  writeFile,
  resolveUrl,
} from "@jsenv/filesystem"
import { sortImportMap } from "@jsenv/importmap"

import { visitNodeModuleResolution } from "./internal/from-package/visitNodeModuleResolution.js"
import { optimizeImportMap } from "./internal/optimizeImportMap.js"
import { visitSourceFiles } from "./internal/from-js/visitSourceFiles.js"

export const writeImportMapFiles = async ({
  logLevel,
  projectDirectoryUrl,
  importMapFiles,
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
    } = importMapConfig
    if (mappingsForNodeResolution) {
      nodeResolutionVisitors.push({
        mappingsForDevDependencies,
        nodeResolutionConditions,
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
    })
  }

  await importMapFileRelativeUrls.reduce(
    async (previous, importMapFileRelativeUrl) => {
      const importMapConfig = importMapFiles[importMapFileRelativeUrl]
      const { mappingsTreeshaking } = importMapConfig
      const importMap = await visitSourceFiles({
        logger,
        warn,
        projectDirectoryUrl,
        importMap: importMaps[importMapFileRelativeUrl],
        mappingsTreeshaking,
      })
      importMaps[importMapFileRelativeUrl] = importMap
    },
    Promise.resolve(),
  )

  Object.keys(importMaps).forEach((key) => {
    const importMap = importMaps[key]
    const importMapNormalized = sortImportMap(optimizeImportMap(importMap))
    importMaps[key] = importMapNormalized
  })

  // for js config we'll see later
  // const firstUpdatingJsConfig = importMapFileRelativeUrls.find(
  //   (importMapFileRelativeUrl) => {
  //     const importMapFileConfig = importMapFiles[importMapFileRelativeUrl]
  //     return importMapFileConfig.useForJsConfigJSON
  //   },
  // )

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
