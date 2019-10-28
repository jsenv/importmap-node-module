const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")

generateImportMapForProjectPackage({
  projectDirectoryPath: __dirname,
  includeDevDependencies: true,
  importMapFile: true,
  importMapFileRelativePath: "./importMap.json",
})
