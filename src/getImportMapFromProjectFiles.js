import { composeTwoImportMaps, sortImportMap } from "@jsenv/import-map"
import { createLogger } from "@jsenv/logger"
import { assertAndNormalizeDirectoryUrl } from "@jsenv/util"

import { getImportMapFromJsFiles } from "./internal/from-js/getImportMapFromJsFiles.js"
import { getImportMapFromPackageFiles } from "./internal/from-package/getImportMapFromPackageFiles.js"

export const getImportMapFromProjectFiles = async ({
  logLevel,
  projectDirectoryUrl,
  runtime = "browser",
  moduleFormat = "esm",
  dev = false,
  jsFiles = true,
  initialImportMap = {},

  projectPackageDevDependenciesIncluded = dev,
  treeshakeMappings = !dev,

  packageConditions = [],
  packageConditionDevelopment = dev,
  packageConditionFromModuleFormat = packageConditionsFromModuleFormat[moduleFormat],
  packageConditionFromRuntime = packageConditionsFromRuntime[runtime],

  magicExtensions = [".js", ".jsx", ".ts", ".tsx", ".node", ".json"],
  onWarn = (warning, warn) => {
    warn(warning)
  },
  packagesManualOverrides,
  ...rest
}) => {
  packageConditions = [
    ...(packageConditionDevelopment ? ["development"] : ["production"]),
    ...(packageConditionFromModuleFormat ? [packageConditionFromModuleFormat] : []),
    ...(packageConditionFromRuntime ? [packageConditionFromRuntime] : []),
    ...packageConditions,
  ]

  const logger = createLogger({ logLevel })
  const warn = wrapWarnToWarnOnce((warning) => {
    onWarn(warning, () => {
      logger.warn(`\n${warning.message}\n`)
    })
  })

  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl)

  // At this point, importmap is relative to the project directory url
  let importMapFromPackageFiles = await getImportMapFromPackageFiles({
    logger,
    warn,
    projectDirectoryUrl,
    packageConditions,
    projectPackageDevDependenciesIncluded,
    packagesManualOverrides,
    ...rest,
  })
  importMapFromPackageFiles = sortImportMap(
    composeTwoImportMaps(initialImportMap, importMapFromPackageFiles),
  )
  if (!jsFiles) {
    return importMapFromPackageFiles
  }

  let importMapFromJsFiles = await getImportMapFromJsFiles({
    logger,
    warn,
    projectDirectoryUrl,
    importMap: importMapFromPackageFiles,
    magicExtensions,
    runtime,
    treeshakeMappings,
  })
  importMapFromJsFiles = sortImportMap(importMapFromJsFiles)
  return importMapFromJsFiles
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

const packageConditionsFromRuntime = {
  browser: "browser",
  node: "node",
}

const packageConditionsFromModuleFormat = {
  esm: "import",
  cjs: "require",
}
