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
    bar: "./node_modules/bar/bar.js",
    foo: "./node_modules/foo/foo.js",
  },
  scopes: {},
}
assert({ actual, expected })
