import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      initialImportMap: {
        imports: {
          "#env": "./env.js",
        },
      },
      mappingsForNodeResolution: true,
      removeUnusedMappings: true,
      packageIncludedPredicate: ({ name }) => name !== "foo",
    },
  },
  writeFiles: false,
})

const actual = importmaps["test.importmap"]
const expected = {
  imports: {
    "#env": "./env.js",
  },
  scopes: {},
}
assert({ actual, expected })
