const { generateCommonJsBundle } = require("@jsenv/core")
const { projectPath } = require("../../jsenv.config.js")

generateCommonJsBundle({
  projectPath,
})
