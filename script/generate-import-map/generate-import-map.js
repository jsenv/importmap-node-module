const { fileURLToPath } = require("url")
const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")
const { projectDirectoryUrl } = require("../../jsenv.config.js")

generateImportMapForProjectPackage({
  projectDirectoryPath: fileURLToPath(projectDirectoryUrl),
  includeDevDependencies: true,
  includeImports: true,
  includeExports: true,
  importMapFile: true,
  jsConfigFile: true,
})
