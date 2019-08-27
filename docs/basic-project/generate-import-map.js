const { generateImportMapForNodeModules } = require("@jsenv/node-module-import-map")

generateImportMapForNodeModules({
  projectPath: __dirname,
  writeImportMapFile: true,
  importMapRelativePath: "/importMap.json",
})
