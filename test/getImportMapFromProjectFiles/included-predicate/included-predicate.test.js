import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"
import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  packageIncludedPredicate: ({ packageName }) => packageName !== "foo",
})
const expected = {
  imports: {
    root: "./index.js",
    bar: "./node_modules/bar/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
