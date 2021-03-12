import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

getImportMapFromProjectFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  projectPackageDevDependenciesIncluded: true,
  importMapFileRelativeUrl: "./import-map.importmap",
}).then((importMap) => {
  console.log(importMap)
})
