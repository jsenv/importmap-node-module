import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "root/": "./",
    "root": "./index.js",
    "foo": "./node_modules/foo/index.js",
  },
  scopes: {
    "./node_modules/foo/": {
      "foo/": "./node_modules/foo/",
    },
  },
}
assert({ actual, expected })
