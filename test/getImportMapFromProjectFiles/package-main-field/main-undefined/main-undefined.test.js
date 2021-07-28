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
    "main-undefined/": "./node_modules/main-undefined/",
    "main-undefined": "./node_modules/main-undefined/index.js",
    "root/": "./",
    "root": "./index",
  },
  scopes: {},
}
assert({ actual, expected })
