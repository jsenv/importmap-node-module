const { createConfig } = require("@jsenv/eslint-config")

const config = createConfig()
config.settings["import/resolver"] = {
  node: {},
}

module.exports = config
