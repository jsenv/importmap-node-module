import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      removeUnusedMappings: true,
      ignoreJsFiles: true,
    },
  },
  writeFiles: false,
})
const actual = importmaps["test.importmap"]
const expected = {
  imports: {
    "@dmail/yo/": "./node_modules/@dmail/yo/",
    "@dmail/yo": "./node_modules/@dmail/yo/index.js",
    "root/": "./",
    "bar/": "./node_modules/bar/",
    "foo/": "./node_modules/foo/",
    "root": "./index.js",
    "bar": "./node_modules/bar/bar.js",
    "foo": "./node_modules/foo/foo.js",
  },
  scopes: {
    "./node_modules/foo/node_modules/bar/": {
      "bar/": "./node_modules/foo/node_modules/bar/",
      "bar": "./node_modules/foo/node_modules/bar/index.js",
    },
    "./node_modules/foo/": {
      "bar/": "./node_modules/foo/node_modules/bar/",
      "bar": "./node_modules/foo/node_modules/bar/index.js",
    },
  },
}
assert({ actual, expected })
