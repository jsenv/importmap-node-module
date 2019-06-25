const { execute, launchNode } = require("@jsenv/core")
const { projectPath } = require("../../jsenv.config.js")

execute({
  projectPath,
  launch: launchNode,
  fileRelativePath: `/${process.argv[2]}`,
})
