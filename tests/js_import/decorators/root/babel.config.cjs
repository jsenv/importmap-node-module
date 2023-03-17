const babelPluginSyntaxJSX = require("@babel/plugin-syntax-jsx")

module.exports = {
  plugins: [
    [
      "@babel/plugin-proposal-decorators",
      {
        decoratorsBeforeExport: true,
      },
    ],
    [
      babelPluginSyntaxJSX,
      {
        pragma: "React.createElement",
        pragmaFrag: "React.Fragment",
      },
    ],
  ],
}
