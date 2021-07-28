import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

getImportMapFromProjectFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  projectPackageDevDependenciesIncluded: true,
  importMapFileRelativeUrl: "./import-map.importmap",
}).then((importMap) => {
  console.log(importMap)
})
