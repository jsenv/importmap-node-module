const { generateCommonJsBundle } = require("@jsenv/bundling")
const { projectPath } = require("../../jsenv.config.js")

generateCommonJsBundle({
  projectPath,
})
