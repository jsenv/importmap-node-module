import { buildProject } from "@jsenv/core"

import * as jsenvConfig from "../../jsenv.config.mjs"

await buildProject({
  ...jsenvConfig,
  buildDirectoryRelativeUrl: "./dist/commonjs/",
  format: "commonjs",
  entryPointMap: {
    "./index.js": "./jsenv_importmap_node_module.cjs",
  },
  runtimeSupport: {
    node: "14.7.0",
  },
  buildDirectoryClean: true,
})
