import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"
import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  jsFilesParsing: false,
})
const expected = {
  imports: {
    "main-jsnext/": "./node_modules/main-jsnext/",
    "main-jsnext": "./node_modules/main-jsnext/jsnext.js",
    "root/": "./",
    "root": "./index",
  },
  scopes: {},
}
assert({ actual, expected })
