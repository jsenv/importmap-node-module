import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const importMap = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  jsFilesParsing: false,
})
const actual = importMap
const expected = {
  imports: {
    "root/": "./",
    "root": "./index",
    "foo": "./node_modules/foo/foo.js",
  },
  scopes: {
    "./node_modules/foo/": {
      "foo/": "./node_modules/foo/",
    },
  },
}
assert({ actual, expected })
