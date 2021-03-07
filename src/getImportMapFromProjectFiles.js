import { sortImportMap } from "@jsenv/import-map"
import { getImportMapFromPackageFiles } from "./internal/package/getImportMapFromPackageFiles.js"

export const getImportMapFromProjectFiles = async ({
  logLevel,
  projectDirectoryUrl,
  target = "browser",
  dev = false,
  ...rest
}) => {
  // At this point, importmap is relative to the project directory url
  const importMapFromPackageFiles = sortImportMap(
    await getImportMapFromPackageFiles({
      logLevel,
      projectDirectoryUrl,
      packagesExportsPreference: [
        "import",
        ...(targetExportsPreferences[target] || []),
        ...(dev ? "development" : "production"),
      ],
      projectPackageDevDependenciesIncluded: dev,
      ...rest,
    }),
  )

  return importMapFromPackageFiles
}

const targetExportsPreferences = {
  browser: ["browser"],
  node: ["node", "require"],
}

// const moveAndSort = (importmap, importMapFileRelativeUrl) => {
//   // At this point, importmap is relative to the project directory url
//   if (!importMapFileRelativeUrl) {
//     return sortImportMap(importmap)
//   }

//   // When there is an importMapFileRelativeUrl we will make remapping relative
//   // to the importmap file future location (where user will write it).
//   // This allows to put the importmap anywhere inside the projectDirectoryUrl.
//   // If possible prefer top level because nesting importmap
//   // can lead to many relative path like ./file.js -> ../../file.js
//   const importMapProjectUrl = resolveUrl("project.importmap", "file://")
//   const importMapRealUrl = resolveUrl(importMapFileRelativeUrl, "file://")
//   const importmapMoved = moveImportMap(importmap, importMapProjectUrl, importMapRealUrl)
//   return sortImportMap(importmapMoved)
// }
