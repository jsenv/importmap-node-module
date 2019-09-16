const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")

generateImportMapForProjectPackage({
  projectPath: __dirname,
  includeDevDependencies: true,
  importMapFile: true,
  importMapFileRelativePath: "/importMap.json",
})
