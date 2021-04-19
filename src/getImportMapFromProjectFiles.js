import { sortImportMap } from "@jsenv/import-map"
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
  removeUnusedMappings = !dev,
  magicExtensions = [".js", ".jsx", ".ts", ".tsx", ".node", ".json"],
  onWarn = (warning, warn) => {
    warn(warning)
  },
  ...rest
}) => {
  const packageConditions = [
    ...(packageConditionsFromModuleFormat[moduleFormat] || [moduleFormat]),
    ...(packageConditionsFromRuntime[runtime] || [runtime]),
    ...(dev ? ["development"] : ["production"]),
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
    projectPackageDevDependenciesIncluded: dev,
    ...rest,
  })
  importMapFromPackageFiles = sortImportMap(importMapFromPackageFiles)
  if (!jsFiles) {
    return importMapFromPackageFiles
  }

  let importMapFromJsFiles = await getImportMapFromJsFiles({
    warn,
    projectDirectoryUrl,
    importMap: importMapFromPackageFiles,
    magicExtensions,
    runtime,
    removeUnusedMappings,
  })
  importMapFromJsFiles = sortImportMap(importMapFromJsFiles)
  return importMapFromJsFiles
}

const packageConditionsFromRuntime = {
  browser: ["browser"],
  node: ["node"],
}

const packageConditionsFromModuleFormat = {
  esm: ["import"],
  cjs: ["require"],
}
