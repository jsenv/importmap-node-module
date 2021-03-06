import { resolveUrl } from "@jsenv/util"
import { moveImportMap, sortImportMap } from "@jsenv/import-map"
import { getImportMapFromPackages } from "./internal/package/getImportMapFromPackages.js"

export const getImportMapFromNodeModules = async ({
  logLevel,
  projectDirectoryUrl,
  importMapFileRelativeUrl,
  target = "browser",
  dev = false,
  ...rest
}) => {
  const importMapForPackages = moveAndSort(
    await getImportMapFromPackages({
      logLevel,
      projectDirectoryUrl,
      packagesExportsPreference: ["import", ...(targetExportsPreferences[target] || [])],
      projectPackageDevDependenciesIncluded: dev,
      ...rest,
    }),
    importMapFileRelativeUrl,
  )

  return importMapForPackages
}

const targetExportsPreferences = {
  browser: ["browser"],
  node: ["node", "require"],
}

const moveAndSort = (importmap, importMapFileRelativeUrl) => {
  // At this point, importmap is relative to the project directory url
  if (!importMapFileRelativeUrl) {
    return sortImportMap(importmap)
  }

  // When there is an importMapFileRelativeUrl we will make remapping relative
  // to the importmap file future location (where user will write it).
  // This allows to put the importmap anywhere inside the projectDirectoryUrl.
  // If possible prefer top level because nesting importmap
  // can lead to many relative path like ./file.js -> ../../file.js
  const importMapProjectUrl = resolveUrl("project.importmap", "file://")
  const importMapRealUrl = resolveUrl(importMapFileRelativeUrl, "file://")
  const importmapMoved = moveImportMap(importmap, importMapProjectUrl, importMapRealUrl)
  return sortImportMap(importmapMoved)
}
