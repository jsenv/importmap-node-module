// const proposalDecorators = require("@babel/plugin-proposal-decorators")

module.exports = {
  plugins: [
    [
      "@babel/plugin-proposal-decorators",
      {
        decoratorsBeforeExport: true,
      },
    ],
  ],
};
