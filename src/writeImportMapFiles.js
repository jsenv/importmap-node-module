import { createLogger } from "@jsenv/logger"
import {
  assertAndNormalizeDirectoryUrl,
  writeFile,
  resolveUrl,
  readFile,
  urlToFileSystemPath,
} from "@jsenv/filesystem"
import {
  composeTwoImportMaps,
  sortImportMap,
  moveImportMap,
} from "@jsenv/importmap"

import { assertManualImportMap } from "./internal/manual_importmap.js"
import { packageConditionsFromPackageUserConditions } from "./internal/package_conditions.js"
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
  exportsFieldWarningConfig,
  // for unit test
  jsConfigFileUrl,
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

    const topLevelMappings = {}
    const scopedMappings = {}
    const importMap = {
      imports: topLevelMappings,
      scopes: scopedMappings,
    }
    importMaps[importMapFileRelativeUrl] = importMap

    const {
      mappingsForNodeResolution,
      mappingsForDevDependencies,
      packageUserConditions,
      packageIncludedPredicate,
      runtime = "browser",
    } = importMapConfig
    if (mappingsForNodeResolution) {
      nodeResolutionVisitors.push({
        mappingsForDevDependencies,
        packageConditions: packageConditionsFromPackageUserConditions({
          runtime,
          packageUserConditions,
        }),
        packageIncludedPredicate,
        onMapping: ({ scope, from, to }) => {
          if (scope) {
            scopedMappings[scope] = {
              ...(scopedMappings[scope] || {}),
              [from]: to,
            }
            if (!topLevelMappings[from]) {
              topLevelMappings[from] = to
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
      exportsFieldWarningConfig,
    })
  }

  // manual importmap
  importMapFileRelativeUrls.forEach((importMapFileRelativeUrl) => {
    const importMapConfig = importMapFiles[importMapFileRelativeUrl]
    const { manualImportMap } = importMapConfig
    if (manualImportMap) {
      assertManualImportMap(manualImportMap)
      const importMap = importMaps[importMapFileRelativeUrl]
      const importMapModified = composeTwoImportMaps(importMap, manualImportMap)
      importMaps[importMapFileRelativeUrl] = importMapModified
    }
  })

  await importMapFileRelativeUrls.reduce(
    async (previous, importMapFileRelativeUrl) => {
      await previous
      const importMapConfig = importMapFiles[importMapFileRelativeUrl]
      const {
        // we could deduce it from the package.json but:
        // 1. project might not use package.json
        // 2. it's a bit magic
        // 3. it's kinda possible to assume an export from "exports" field is the main entry point
        //    but for project with many entry points they cannot be distinguised from
        //    "subpath exports" https://nodejs.org/api/packages.html#subpath-exports
        entryPointsToCheck,
        // ideally we could enable extensionlessAutomapping and bareSpecifierAutomapping only for a subset
        // of files. Not that hard to do, especially using @jsenv/url-meta
        // but that's super extra fine tuning that I don't have time/energy to do for now
        bareSpecifierAutomapping,
        extensionlessAutomapping,
        magicExtensions,
        removeUnusedMappings,
        runtime = "browser",
      } = importMapConfig

      if (removeUnusedMappings && !entryPointsToCheck) {
        logger.warn(
          `"entryPointsToCheck" is required when "removeUnusedMappings" is enabled`,
        )
      }
      if (extensionlessAutomapping && !entryPointsToCheck) {
        logger.warn(
          `"entryPointsToCheck" is required when "extensionlessAutomapping" is enabled`,
        )
      }

      if (entryPointsToCheck) {
        const importMap = await visitSourceFiles({
          logger,
          warn,
          projectDirectoryUrl,
          entryPointsToCheck,
          importMap: importMaps[importMapFileRelativeUrl],
          bareSpecifierAutomapping,
          extensionlessAutomapping,
          magicExtensions,
          removeUnusedMappings,
          runtime,
        })
        importMaps[importMapFileRelativeUrl] = importMap
      }
    },
    Promise.resolve(),
  )

  const firstUpdatingJsConfig = importMapFileRelativeUrls.find(
    (importMapFileRelativeUrl) => {
      const importMapFileConfig = importMapFiles[importMapFileRelativeUrl]
      return importMapFileConfig.useForJsConfigJSON
    },
  )
  if (firstUpdatingJsConfig) {
    jsConfigFileUrl =
      jsConfigFileUrl || resolveUrl("./jsconfig.json", projectDirectoryUrl)
    const jsConfigCurrent = (await readCurrentJsConfig(jsConfigFileUrl)) || {
      compilerOptions: {},
    }
    const importMapUsedForVsCode = importMaps[firstUpdatingJsConfig]
    const jsConfigPaths = importMapToVsCodeConfigPaths(importMapUsedForVsCode)
    const jsConfig = {
      ...jsConfigDefault,
      ...jsConfigCurrent,
      compilerOptions: {
        ...jsConfigDefault.compilerOptions,
        ...jsConfigCurrent.compilerOptions,
        // importmap is the source of truth -> paths are overwritten
        // We coudldn't differentiate which one we created and which one where added manually anyway
        paths: jsConfigPaths,
      },
    }
    await writeFile(jsConfigFileUrl, JSON.stringify(jsConfig, null, "  "))
    logger.info(`-> ${urlToFileSystemPath(jsConfigFileUrl)}`)
  }

  Object.keys(importMaps).forEach((key) => {
    let importMap = importMaps[key]
    importMap = optimizeImportMap(importMap)
    const importmapFileUrl = resolveUrl(key, projectDirectoryUrl)
    importMap = moveImportMap(importMap, projectDirectoryUrl, importmapFileUrl)
    importMap = sortImportMap(importMap)
    importMaps[key] = importMap
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
        logger.info(`-> ${urlToFileSystemPath(importmapFileUrl)}`)
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
