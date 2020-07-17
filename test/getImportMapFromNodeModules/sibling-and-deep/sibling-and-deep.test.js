import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromNodeModules } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await getImportMapFromNodeModules({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "nested": "./node_modules/nested/index",
    "root/": "./",
    "root": "./index.js",
  },
  scopes: {
    "./node_modules/nested/node_modules/bar/": {
      "bar/": "./node_modules/nested/node_modules/bar/",
    },
    "./node_modules/nested/node_modules/foo/": {
      "foo/": "./node_modules/nested/node_modules/foo/",
      "bar": "./node_modules/nested/node_modules/bar/bar.js",
    },
    "./node_modules/nested/": {
      "nested/": "./node_modules/nested/",
      "bar": "./node_modules/nested/node_modules/bar/bar.js",
      "foo": "./node_modules/nested/node_modules/foo/foo.js",
    },
  },
}
assert({ actual, expected })
