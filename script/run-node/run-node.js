const { execute, launchNode } = require("@jsenv/core")
const { projectFolder } = require("../../jsenv.config.js")
const { getFromProcessArguments } = require("./getFromProcessArguments.js")

const filenameRelative = getFromProcessArguments("file")

execute({
  projectFolder,
  launch: launchNode,
  filenameRelative,
  mirrorConsole: true,
})
