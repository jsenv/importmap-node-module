const { createEslintConfig } = require("@jsenv/eslint-config")

const config = createEslintConfig({
  importResolutionMethod: "node",
})

module.exports = config
