import { getImportMapFromNodeModules } from "@jsenv/node-module-import-map"

const importMap = await getImportMapFromNodeModules({
  projectDirectoryUrl: __dirname,
  projectPackageDevDependenciesIncluded: true,
  importMapFileRelativeUrl: "./import-map.importmap",
})

console.log(importMap)
