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
    "main-folder-trailing/": "./node_modules/main-folder-trailing/",
    "main-folder-trailing": "./node_modules/main-folder-trailing/lib/index.js",
    "root/": "./",
    "root": "./index",
  },
  scopes: {},
}
assert({ actual, expected })
