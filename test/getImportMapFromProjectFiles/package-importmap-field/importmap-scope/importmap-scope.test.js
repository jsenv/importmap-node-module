import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  jsFilesParsing: false,
})
const expected = {
  imports: {
    "root/": "./",
    "foo/": "./node_modules/foo/",
    "root": "./index",
    "foo": "./node_modules/foo/index",
  },
  scopes: {
    "./node_modules/foo/src/": {
      "./a.js": "./node_modules/foo/src/b.js",
    },
  },
}
assert({ actual, expected })
