const { generateImportMapForProjectNodeModules } = require("@jsenv/node-module-import-map")
const { projectPath } = require("../../jsenv.config.js")

generateImportMapForProjectNodeModules({ projectPath })
