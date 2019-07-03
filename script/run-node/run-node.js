const { execute } = require("@jsenv/core")
const { launchNode } = require("@jsenv/node-launcher")
const { projectPath } = require("../../jsenv.config.js")

execute({
  projectPath,
  launch: launchNode,
  fileRelativePath: `/${process.argv[2]}`,
})
