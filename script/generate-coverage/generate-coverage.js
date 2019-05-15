const { cover } = require("@jsenv/core")
const { projectFolder, testDescription } = require("../../jsenv.config.js")

cover({
  projectFolder,
  executeDescription: testDescription,
  logCoverageTable: true,
  writeCoverageHtmlFolder: true,
})
