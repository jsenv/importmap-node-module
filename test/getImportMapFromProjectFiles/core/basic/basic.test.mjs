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
      ignoreSourceFiles: true,
    },
  },
  writeFiles: false,
})
const actual = importmaps["test.importmap"]
const expected = {
  imports: {
    "root/": "./",
    "root": "./index.js",
    "foo": "./node_modules/foo/foo.js",
  },
  scopes: {
    "./node_modules/bar/": {
      "bar/": "./node_modules/bar/",
      "bar": "./node_modules/bar/bar.js",
    },
    "./node_modules/foo/": {
      "foo/": "./node_modules/foo/",
      "bar": "./node_modules/bar/bar.js",
    },
  },
}
assert({ actual, expected })
