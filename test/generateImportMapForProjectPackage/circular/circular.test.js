import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    bar: "./node_modules/bar/bar.js",
    foo: "./node_modules/foo/foo.js",
  },
  scopes: {},
}
assert({ actual, expected })
