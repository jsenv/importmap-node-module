const { execute } = require("@jsenv/core")
const { launchNode } = require("@jsenv/node-launcher")
const { projectPath } = require("../../jsenv.config.js")

execute({
  projectPath,
  launch: (options) => launchNode({ ...options, debugPort: 40000 }),
  fileRelativePath: `/${process.argv[2]}`,
})
