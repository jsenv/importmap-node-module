import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromNodeModules } from "../../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await getImportMapFromNodeModules({
  logLevel: "error",
  projectDirectoryUrl: testDirectoryUrl,
  packagesSelfReference: false,
})
const expected = {
  imports: {},
  scopes: {},
}
assert({ actual, expected })
