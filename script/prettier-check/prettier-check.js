const { prettierCheckProject } = require("@jsenv/prettier-check-project")
const { projectPath } = require("../../jsenv.config.js")

prettierCheckProject({
  projectPath,
})
