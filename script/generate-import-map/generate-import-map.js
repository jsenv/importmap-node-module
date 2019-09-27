const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")
const { projectPath } = require("../../jsenv.config.js")

generateImportMapForProjectPackage({
  projectPath,
  includeDevDependencies: true,
  importMapFile: true,
  jsConfigFile: true,
})
