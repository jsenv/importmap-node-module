const { prettierCheckProject, jsenvPrettifyMap } = require("@jsenv/prettier-check-project")
const { projectDirectoryPath } = require("../../jsenv.config.js")

prettierCheckProject({
  projectPath: projectDirectoryPath,
  prettifyMap: {
    ...jsenvPrettifyMap,
    "/docs/basic-project/node_modules/": false,
    "/.jsenv/": false,
  },
})
