const { test } = require("@jsenv/core")
const { projectPath, testDescription } = require("../../jsenv.config.js")

test({
  projectPath,
  executeDescription: testDescription,
})
