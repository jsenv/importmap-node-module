const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")

generateImportMapForProjectPackage({
  projectDirectoryUrl: __dirname,
  includeDevDependencies: false,
  importMapFile: true,
  importMapFileRelativeUrl: "./importMap.json",
})
