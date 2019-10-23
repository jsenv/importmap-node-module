const { autoReleaseOnGithub } = require("@jsenv/auto-publish")
const { projectPath } = require("../jsenv.config.js")

autoReleaseOnGithub({
  projectPath,
})
