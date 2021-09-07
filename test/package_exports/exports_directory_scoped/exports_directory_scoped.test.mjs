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
    "foo/ding": "./node_modules/foo/dong",
    "root/": "./",
    "root": "./index.js",
    "foo": "./node_modules/foo/index.js",
  },
  scopes: {
    "./node_modules/foo/node_modules/exporting-folder/": {
      "exporting-folder/": "./node_modules/foo/node_modules/exporting-folder/",
      "exporting-folder":
        "./node_modules/foo/node_modules/exporting-folder/index.js",
    },
    "./node_modules/foo/": {
      "exporting-folder/": "./node_modules/foo/node_modules/exporting-folder/",
      "exporting-folder":
        "./node_modules/foo/node_modules/exporting-folder/index.js",
    },
  },
}
assert({ actual, expected })
