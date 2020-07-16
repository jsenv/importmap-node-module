import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { computeImportMapForNodeModules } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await computeImportMapForNodeModules({
  projectDirectoryUrl: testDirectoryUrl,
  packagesSelfImport: false,
})
const expected = {
  imports: {
    "@jsenv/whatever/": "./node_modules/@jsenv/whatever/",
    "@jsenv/whatever": "./node_modules/@jsenv/whatever/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
