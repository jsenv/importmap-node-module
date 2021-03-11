import { sortImportMap, composeTwoImportMaps } from "@jsenv/import-map"
import { getImportMapFromJsFiles } from "./internal/from-js/getImportMapFromJsFiles.js"
import { getImportMapFromPackageFiles } from "./internal/from-package/getImportMapFromPackageFiles.js"

export const getImportMapFromProjectFiles = async ({
  logLevel,
  projectDirectoryUrl,
  runtime = "browser",
  dev = false,
  magicExtensions,
  ...rest
}) => {
  const packagesExportsPreference = [
    "import",
    ...(runtimeExportsPreferences[runtime] || [runtime]),
    ...(dev ? "development" : "production"),
  ]

  // At this point, importmap is relative to the project directory url
  const importMapFromPackageFiles = sortImportMap(
    await getImportMapFromPackageFiles({
      logLevel,
      projectDirectoryUrl,
      packagesExportsPreference,
      projectPackageDevDependenciesIncluded: dev,
      ...rest,
    }),
  )

  const importMapFromJsFiles = await getImportMapFromJsFiles({
    logLevel,
    importMap: importMapFromPackageFiles,
    projectDirectoryUrl,
    magicExtensions,
    packagesExportsPreference,
    runtime,
  })

  return composeTwoImportMaps(importMapFromPackageFiles, importMapFromJsFiles)
}

const runtimeExportsPreferences = {
  browser: ["browser"],
  node: ["node", "require"],
}
