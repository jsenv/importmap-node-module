const { uploadCoverage } = require("@jsenv/codecov-upload")
const { projectDirectoryPath } = require("../../jsenv.config.js")

uploadCoverage({
  projectPath: projectDirectoryPath,
})
