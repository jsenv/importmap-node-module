const { createConfig } = require("@jsenv/eslint-config")

const config = createConfig()
config.rules["import/no-absolute-path"] = ["off"]
config.settings["import/resolver"] = {
  [`${__dirname}/node_modules/@jsenv/eslint-import-resolver/dist/node/main.js`]: {
    projectFolder: __dirname,
  },
}

module.exports = config
