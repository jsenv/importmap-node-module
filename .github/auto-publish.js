const { autoPublish } = require("@jsenv/auto-publish")
const { projectDirectoryPath } = require("../jsenv.config.js")

autoPublish({
  projectPath: projectDirectoryPath,
  registryMap: {
    "https://registry.npmjs.org": {
      token: process.env.NPM_TOKEN,
    },
    "https://npm.pkg.github.com": {
      token: process.env.GITHUB_TOKEN,
    },
  },
})
