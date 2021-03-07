import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  logLevel: "error",
  projectDirectoryUrl: testDirectoryUrl,
  packagesSelfReference: false,
})
const expected = {
  imports: {},
  scopes: {},
}
assert({ actual, expected })
