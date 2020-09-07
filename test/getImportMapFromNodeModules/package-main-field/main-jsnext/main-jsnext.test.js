import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromNodeModules } from "../../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await getImportMapFromNodeModules({
  projectDirectoryUrl: testDirectoryUrl,
  packagesSelfReference: false,
})
const expected = {
  imports: {
    "main-jsnext": "./node_modules/main-jsnext/jsnext.js",
  },
  scopes: {},
}
assert({ actual, expected })
