const { uploadCoverage } = require("@jsenv/codecov-upload")
const { projectFolder } = require("../../jsenv.config.js")

uploadCoverage({
  projectFolder,
})
