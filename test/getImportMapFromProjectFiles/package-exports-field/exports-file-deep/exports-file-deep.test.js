import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"

import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const importMap = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  jsFilesParsing: false,
})
const actual = importMap
const expected = {
  imports: {
    "root/": "./",
    "foo/": "./node_modules/foo/",
    "root": "./index",
    "foo": "./node_modules/foo/index",
  },
  scopes: {
    "./node_modules/bar/": {
      "bar/file.js": "./node_modules/bar/src/file.js",
      "bar/": "./node_modules/bar/",
    },
    "./node_modules/foo/": {
      "bar/file.js": "./node_modules/bar/src/file.js",
    },
  },
}
assert({ actual, expected })
