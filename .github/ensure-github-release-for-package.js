const { ensureGithubReleaseForPackage } = require("@jsenv/github-release-package")
const { projectDirectoryUrl } = require("../jsenv.config.js")

ensureGithubReleaseForPackage({
  projectDirectoryUrl,
})
