import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  logLevel: "error",
  projectDirectoryUrl: testDirectoryUrl,
  jsFilesParsing: false,
})
const expected = {
  imports: {
    "root/": "./",
    "root": "./index",
  },
  scopes: {},
}
assert({ actual, expected })
