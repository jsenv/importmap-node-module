const { createConfig } = require("@jsenv/eslint-config")

const config = createConfig({
  projectDirectoryPath: __dirname,
  importResolutionMethod: "import-map",
})

module.exports = config
