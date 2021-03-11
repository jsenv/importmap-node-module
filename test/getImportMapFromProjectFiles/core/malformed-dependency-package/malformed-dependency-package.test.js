import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  logLevel: "off",
  projectDirectoryUrl: testDirectoryUrl,
  jsFiles: false,
})
const expected = {
  imports: {
    root: "./index",
  },
  scopes: {},
}
// we could/should also expect a console.warn occurs
assert({ actual, expected })
