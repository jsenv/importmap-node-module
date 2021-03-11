import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const importMap = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  jsFiles: false,
})
const actual = importMap
const expected = {
  imports: {
    root: "./index",
    foo: "./node_modules/foo/foo.js",
  },
  scopes: {},
}
assert({ actual, expected })
