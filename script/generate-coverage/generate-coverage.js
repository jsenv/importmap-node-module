const { cover } = require("@jsenv/testing")
const { projectPath, testDescription } = require("../../jsenv.config.js")

cover({
  projectPath,
  executeDescription: testDescription,
  logCoverageTable: true,
  writeCoverageHtmlFolder: true,
})
