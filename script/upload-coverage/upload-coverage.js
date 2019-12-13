const { uploadCoverage } = require("@jsenv/codecov-upload")
const jsenvConfig = require("../../jsenv.config.js")

uploadCoverage({
  ...jsenvConfig,
})
