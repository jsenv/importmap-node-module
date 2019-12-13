const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")
const jsenvConfig = require("../../jsenv.config.js")

generateImportMapForProjectPackage({
  ...jsenvConfig,
  importMapFile: true,
  jsConfigFile: true,
})
