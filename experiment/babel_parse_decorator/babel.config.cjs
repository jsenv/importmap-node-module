// const proposalDecorators = require("@babel/plugin-proposal-decorators")

module.exports = {
  plugins: [
    [
      "decorators",
      {
        decoratorsBeforeExport: true,
      },
    ],
    [
      "@babel/plugin-proposal-class-properties",
      {
        loose: true,
      },
    ],
  ],
}
