const { autoReleaseOnGithub } = require("@jsenv/auto-publish")
const { projectDirectoryPath } = require("../jsenv.config.js")

autoReleaseOnGithub({
  projectPath: projectDirectoryPath,
})
