const { test } = require("@jsenv/core")
const { projectPath, testDescription } = require("../../jsenv.config.js")

test({
  projectFolder: projectPath,
  executeDescription: testDescription,
})
