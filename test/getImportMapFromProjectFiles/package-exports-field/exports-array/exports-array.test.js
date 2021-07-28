import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"

import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    whatever: "./index.js",
    foo: "./node_modules/foo/main.import.js",
  },
  scopes: {},
}
assert({ actual, expected })
