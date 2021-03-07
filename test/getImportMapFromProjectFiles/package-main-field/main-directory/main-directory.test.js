import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  packagesSelfReference: false,
})
const expected = {
  imports: {
    "main-directory": "./node_modules/main-directory/lib/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
