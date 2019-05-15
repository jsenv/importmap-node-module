const { prettierCheckProject } = require("@jsenv/prettier-check-project")
const { projectFolder } = require("../../jsenv.config.js")

prettierCheckProject({
  projectFolder,
})
