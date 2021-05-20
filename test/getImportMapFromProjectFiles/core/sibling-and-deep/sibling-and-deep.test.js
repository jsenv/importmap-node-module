import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"

import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "nested/": "./node_modules/nested/",
    "nested": "./node_modules/nested/index.js",
    "root/": "./",
    "root": "./index.js",
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
