const { generateImportMapForNodeModules } = require("../../dist/commonjs/main.js")
const { projectPath } = require("../../jsenv.config.js")

generateImportMapForNodeModules({ projectPath, writeImportMapFile: true, writeJsconfigFile: true })
