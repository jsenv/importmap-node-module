const { test } = require("@jsenv/testing")
const { projectPath, testDescription } = require("../../jsenv.config.js")

test({
  projectPath,
  executeDescription: testDescription,
})
