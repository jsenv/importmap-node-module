const { test } = require("@jsenv/core")
const { projectFolder, testDescription } = require("../../jsenv.config.js")

test({
  projectFolder,
  executeDescription: testDescription,
})
