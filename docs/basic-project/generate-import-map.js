import { getImportMapFromNodeModules } from "@jsenv/node-module-import-map"

getImportMapFromNodeModules({
  projectDirectoryUrl: new URL("./", import.meta.url),
  projectPackageDevDependenciesIncluded: true,
  importMapFileRelativeUrl: "./import-map.importmap",
}).then((importMap) => {
  console.log(importMap)
})
