import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const warnings = []
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      removeUnusedMappings: true,
      runtime: "node",
    },
  },
  onWarn: (warning) => {
    warnings.push(warning)
  },
  writeFiles: false,
})

const actual = {
  warnings,
  importmaps,
}
const expected = {
  warnings: [],
  importmaps: {
    "test.importmap": {
      imports: {
        root: "./index.js",
      },
      scopes: {},
    },
  },
}
assert({ actual, expected })
