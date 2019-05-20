const { uploadCoverage } = require("@jsenv/codecov-upload")
const { projectPath } = require("../../jsenv.config.js")

uploadCoverage({
  projectFolder: projectPath,
})
