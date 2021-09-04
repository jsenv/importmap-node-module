import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      mappingsTreeshaking: true,
      // ignoreJsFiles: true,
      packageIncludedPredicate: ({ name }) => name !== "foo",
    },
  },
  writeFiles: false,
})
const actual = importmaps["test.importmap"]
const expected = {
  imports: {
    root: "./index.js",
    bar: "./node_modules/bar/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
