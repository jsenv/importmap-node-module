const { prettierCheckProject, jsenvPrettifyMap } = require("@jsenv/prettier-check-project")
const { projectPath } = require("../../jsenv.config.js")

prettierCheckProject({
  projectPath,
  prettifyMap: {
    ...jsenvPrettifyMap,
    "/docs/basic-project/node_modules/": false,
  },
})
