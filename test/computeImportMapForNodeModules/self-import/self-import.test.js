import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { computeImportMapForNodeModules } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await computeImportMapForNodeModules({
  projectDirectoryUrl: testDirectoryUrl,
  packagesSelfImport: true,
})
const expected = {
  imports: {
    "root/": "./",
    "root": "./index.js",
  },
  scopes: {},
}
assert({ actual, expected })
