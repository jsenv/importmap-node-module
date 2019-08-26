const { createConfig } = require("@jsenv/eslint-config")

const config = createConfig({
  importResolutionMethod: "import-map",
  projectPath: __dirname,
})

module.exports = config
