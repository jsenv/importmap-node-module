const { generateImportMapForNodeModules } = require("@jsenv/node-module-import-map")
const { projectPath } = require("../../jsenv.config.js")

generateImportMapForNodeModules({
  projectPath,
  includeDevDependencies: true,
  writeImportMapFile: true,
  writeJsConfigFile: true,
})
