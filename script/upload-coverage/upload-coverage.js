const { fileURLToPath } = require("url")
const { uploadCoverage } = require("@jsenv/codecov-upload")
const { projectDirectoryUrl } = require("../../jsenv.config.js")

uploadCoverage({
  projectPath: fileURLToPath(projectDirectoryUrl),
})
