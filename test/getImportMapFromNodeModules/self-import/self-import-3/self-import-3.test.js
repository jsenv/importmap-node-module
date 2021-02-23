import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromNodeModules } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await getImportMapFromNodeModules({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "root/boo": "./lib/boo.js",
    "foo/bar": "./node_modules/foo/src/bar.js",
    "root/": "./",
    "foo/": "./node_modules/foo/",
    "root": "./index.js",
    "foo": "./node_modules/foo/index",
  },
  scopes: {},
}
assert({ actual, expected })
