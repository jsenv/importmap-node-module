const { installGitHooks } = require("@jsenv/git-hooks")
const jsenvConfig = require("../../jsenv.config.js")

installGitHooks({
  ...jsenvConfig,
})
