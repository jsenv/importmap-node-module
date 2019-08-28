const { generateImportMapForNodeModules } = require("@jsenv/node-module-import-map")
const { projectPath } = require("../../jsenv.config.js")

generateImportMapForNodeModules({
  projectPath,
  writeImportMapFile: true,
  writeJsConfigFile: true,
})
