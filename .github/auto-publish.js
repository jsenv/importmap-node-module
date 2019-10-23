const { autoPublish } = require("@jsenv/auto-publish")
const { projectPath } = require("../jsenv.config.js")

autoPublish({
  projectPath,
  registryMap: {
    "https://registry.npmjs.org": {
      token: process.env.NPM_TOKEN,
    },
    "https://npm.pkg.github.com": {
      token: process.env.GITHUB_TOKEN,
    },
  },
})
