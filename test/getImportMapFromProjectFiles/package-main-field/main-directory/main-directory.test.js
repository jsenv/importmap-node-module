import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"
import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "main-directory": "./node_modules/main-directory/lib/index.js",
    "root": "./index.js",
  },
  scopes: {},
}
assert({ actual, expected })
