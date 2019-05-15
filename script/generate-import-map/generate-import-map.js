const { generateImportMapForProjectNodeModules } = require("@jsenv/core")
const { projectFolder } = require("../../jsenv.config.js")

generateImportMapForProjectNodeModules({ projectFolder })
