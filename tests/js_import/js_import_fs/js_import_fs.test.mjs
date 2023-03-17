import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/urls"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const test = async ({ runtime } = {}) => {
  const warnings = []
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        entryPointsToCheck: ["./index.js"],
        removeUnusedMappings: true,
        runtime,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning)
    },
    writeFiles: false,
  })
  return { warnings, importmaps }
}

{
  const actual = await test()
  const expected = {
    warnings: [
      {
        code: "IMPORT_RESOLUTION_FAILED",
        message: `Import resolution failed for "fs"
--- import trace ---
${testDirectoryUrl}index.js:1:7
> 1 | import "fs"
    |       ^
  2 |${" "}
--- reason ---
there is no mapping for this bare specifier
--- suggestion 1 ---
use runtime: "node"`,
      },
    ],
    importmaps: {
      "test.importmap": {
        imports: {},
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}

{
  const actual = await test({ runtime: "node" })
  const expected = {
    warnings: [],
    importmaps: {
      "test.importmap": {
        imports: {},
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}
