const { execute, launchNode } = require("@jsenv/core")
const { projectPath } = require("../../jsenv.config.js")
const { getFromProcessArguments } = require("./getFromProcessArguments.js")

const filenameRelative = getFromProcessArguments("file")

execute({
  projectPath,
  launch: (options) => launchNode({ ...options, debugModeInheritBreak: true }),
  fileRelativePath: `/${filenameRelative}`,
  mirrorConsole: true,
})
