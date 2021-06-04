import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  initialImportMap: {
    imports: {
      "#env": "./env.js",
    },
  },
})
const expected = {
  imports: {
    "#env": "./env.js",
    "root": "./index.js",
  },
  scopes: {},
}
assert({ actual, expected })
