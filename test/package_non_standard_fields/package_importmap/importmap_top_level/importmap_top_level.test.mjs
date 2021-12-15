import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
    },
  },
  writeFiles: false,
})

const actual = importmaps["test.importmap"]
const expected = {
  imports: {
    "./a.js": "./node_modules/foo/b.js",
    "root/": "./",
    "foo/": "./node_modules/foo/",
    "root": "./index.js",
    "foo": "./node_modules/foo/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
