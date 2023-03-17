const { resolve } = require("path")

const babelConfigFilePath = resolve(__dirname, "./babel.config.cjs")

module.exports = {
  parser: "@babel/eslint-parser",
  parserOptions: {
    babelOptions: {
      configFile: babelConfigFilePath,
    },
  },
}
