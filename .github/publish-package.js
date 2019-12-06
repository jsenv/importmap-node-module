const { publishPackage } = require("@jsenv/package-publish")
const { projectDirectoryUrl } = require("../jsenv.config.js")

publishPackage({
  projectDirectoryUrl,
  registriesConfig: {
    "https://registry.npmjs.org": {
      token: process.env.NPM_TOKEN,
    },
    "https://npm.pkg.github.com": {
      token: process.env.GITHUB_TOKEN,
    },
  },
})
