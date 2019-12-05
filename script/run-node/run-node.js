const { execute, launchNode } = require("@jsenv/core")
const jsenvConfig = require("../../jsenv.config.js")

execute({
  ...jsenvConfig,
  launch: (options) => launchNode({ ...options, debugPort: 40000 }),
  fileRelativeUrl: process.argv[2],
})
