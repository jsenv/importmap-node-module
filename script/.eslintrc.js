const { createConfig } = require("@jsenv/eslint-config")

const config = createConfig({
  importResolutionMethod: "node",
})

module.exports = config
