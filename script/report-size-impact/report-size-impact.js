const { reportSizeImpactIntoGithubPullRequest } = require("@jsenv/continuous-size-reporting")
const { projectPath } = require("../../jsenv.config.js")

reportSizeImpactIntoGithubPullRequest({
  projectPath,
})
