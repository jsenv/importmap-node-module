const { generateCommonJsBundleForNode } = require("@jsenv/bundling")
const { projectPath } = require("../../jsenv.config.js")

generateCommonJsBundleForNode({
  projectPath,
})
