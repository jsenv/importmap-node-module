const { prettierCheckProject } = require("@jsenv/prettier-check-project")
const jsenvConfig = require("../../jsenv.config.js")

prettierCheckProject({
  ...jsenvConfig,
})
