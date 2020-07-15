const { createEslintConfig } = require("@jsenv/eslint-config")

const config = createEslintConfig({
  projectDirectoryUrl: __dirname,
  importMapFileRelativeUrl: "./import-map.importmap",
  importResolutionMethod: "import-map",
})

module.exports = config
