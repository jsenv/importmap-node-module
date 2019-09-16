const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")

generateImportMapForProjectPackage({
  projectPath: __dirname,
  importMapFile: true,
  importMapFileRelativePath: "/importMap.json",
})
