const { launchNode } = require("@jsenv/node-launcher")

const projectPath = __dirname
exports.projectPath = projectPath

const testDescription = {
  "/test/**/*.test.js": {
    node: {
      launch: launchNode,
    },
  },
}
exports.testDescription = testDescription
