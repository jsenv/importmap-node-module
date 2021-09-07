const syntaxDecorators = require("@babel/plugin-syntax-decorators")

module.exports = {
  plugins: [[syntaxDecorators, { decoratorsBeforeExport: true }]],
}
