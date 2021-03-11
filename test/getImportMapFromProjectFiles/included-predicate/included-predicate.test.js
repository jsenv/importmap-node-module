import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  packageIncludedPredicate: ({ packageName }) => packageName !== "foo",
})
const expected = {
  imports: {
    root: "./index",
    bar: "./node_modules/bar/index",
  },
  scopes: {},
}
assert({ actual, expected })
