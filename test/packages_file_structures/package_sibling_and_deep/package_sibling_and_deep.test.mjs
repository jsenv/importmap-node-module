import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./index.js"],
      removeUnusedMappings: true,
    },
  },
  writeFiles: false,
})

const actual = importmaps["test.importmap"]
const expected = {
  imports: {
    "nested/": "./node_modules/nested/",
    "nested": "./node_modules/nested/index.js",
    "root/": "./",
  },
  scopes: {
    "./node_modules/nested/node_modules/bar/": {
      "bar/": "./node_modules/nested/node_modules/bar/",
    },
    "./node_modules/nested/node_modules/foo/": {
      "bar/": "./node_modules/nested/node_modules/bar/",
      "foo/": "./node_modules/nested/node_modules/foo/",
      "bar": "./node_modules/nested/node_modules/bar/bar.js",
    },
    "./node_modules/nested/": {
      "bar/": "./node_modules/nested/node_modules/bar/",
      "foo/": "./node_modules/nested/node_modules/foo/",
      "bar": "./node_modules/nested/node_modules/bar/bar.js",
      "foo": "./node_modules/nested/node_modules/foo/foo.js",
    },
  },
}
assert({ actual, expected })
