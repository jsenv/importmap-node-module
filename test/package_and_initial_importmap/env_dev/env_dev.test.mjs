import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const warnings = []
const importMaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      initialImportMap: {
        imports: {
          "#env": "./env.dev.js",
        },
      },
      mappingsForNodeResolution: true,
      removeUnusedMappings: true,
    },
  },
  onWarn: (warning) => {
    warnings.push(warning)
  },
  writeFiles: false,
})
const actual = {
  warnings,
  importMaps,
}
const expected = {
  warnings: [],
  importMaps: {
    "test.importmap": {
      imports: {
        "#env": "./env.dev.js",
      },
      scopes: {},
    },
  },
}
assert({ actual, expected })
