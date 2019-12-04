const { generateCommonJsBundleForNode } = require("@jsenv/core")
const jsenvConfig = require("../../jsenv.config.js")

generateCommonJsBundleForNode({
  ...jsenvConfig,
})
