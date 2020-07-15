const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")

generateImportMapForProjectPackage({
  projectDirectoryUrl: __dirname,
  includeDevDependencies: true,
  importMapFile: true,
  importMapFileRelativeUrl: "./import-map.importmap",
})
