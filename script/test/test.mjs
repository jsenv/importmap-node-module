import { executeTestPlan, nodeRuntime } from "@jsenv/core"

import { projectDirectoryUrl } from "../../jsenv.config.mjs"

await executeTestPlan({
  projectDirectoryUrl,
  testPlan: {
    "test/**/*.test.mjs": {
      node: {
        runtime: nodeRuntime,
      },
    },
  },
  completedExecutionLogMerging: true,
})
