import { composeTwoImportMaps, sortImportMap } from "@jsenv/import-map"
import { createLogger } from "@jsenv/logger"
import { getImportMapFromJsFiles } from "./internal/from-js/getImportMapFromJsFiles.js"
import { getImportMapFromPackageFiles } from "./internal/from-package/getImportMapFromPackageFiles.js"

export const getImportMapFromProjectFiles = async ({
  logLevel,
  projectDirectoryUrl,
  runtime = "browser",
  moduleFormat = "esm",
  dev = false,
  jsFiles = true,
  importMapInput = {},

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
  ...rest
}) => {
  packageConditions = [
    ...(packageConditionDevelopment ? ["development"] : ["production"]),
    ...(packageConditionFromModuleFormat ? [packageConditionFromModuleFormat] : []),
    ...(packageConditionFromRuntime ? [packageConditionFromRuntime] : []),
    ...packageConditions,
  ]

  const logger = createLogger({ logLevel })
  const warn = (warning) => {
    onWarn(warning, () => {
      logger.warn(`\n${warning.message}\n`)
    })
  }

  // At this point, importmap is relative to the project directory url
  let importMapFromPackageFiles = await getImportMapFromPackageFiles({
    logger,
    warn,
    projectDirectoryUrl,
    packageConditions,
    projectPackageDevDependenciesIncluded,
    ...rest,
  })
  importMapFromPackageFiles = sortImportMap(importMapFromPackageFiles)
  if (!jsFiles) {
    return importMapFromPackageFiles
  }

  let importMapFromJsFiles = await getImportMapFromJsFiles({
    warn,
    projectDirectoryUrl,
    importMap: composeTwoImportMaps(importMapInput, importMapFromPackageFiles),
    magicExtensions,
    runtime,
    treeshakeMappings,
  })
  importMapFromJsFiles = sortImportMap(importMapFromJsFiles)
  return importMapFromJsFiles
}

const packageConditionsFromRuntime = {
  browser: "browser",
  node: "node",
}

const packageConditionsFromModuleFormat = {
  esm: "import",
  cjs: "require",
}
