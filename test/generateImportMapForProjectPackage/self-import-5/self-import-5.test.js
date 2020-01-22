import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "@jsenv/core/": "./node_modules/@jsenv/core/",
    "@jsenv/core": "./node_modules/@jsenv/core/index",
  },
  scopes: {},
}
assert({ actual, expected })
