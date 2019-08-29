const { generateImportMapForNodeModules } = require("@jsenv/node-module-import-map")
const { projectPath } = require("../../jsenv.config.js")

generateImportMapForNodeModules({
  projectPath,
  remapDevDependencies: true,
  writeImportMapFile: true,
  writeJsConfigFile: true,
})
