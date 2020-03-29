import { execute, launchNode } from "@jsenv/core"
import * as jsenvConfig from "../../jsenv.config.js"

execute({
  ...jsenvConfig,
  launch: (options) => launchNode({ ...options, debugPort: 40000 }),
  fileRelativeUrl: process.argv[2],
})
