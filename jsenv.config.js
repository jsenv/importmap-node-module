const { launchNode } = require("@jsenv/core")

const projectFolder = __dirname
exports.projectFolder = projectFolder

const testDescription = {
  "/test/**/*.test.js": {
    node: {
      launch: launchNode,
    },
  },
}
exports.testDescription = testDescription
