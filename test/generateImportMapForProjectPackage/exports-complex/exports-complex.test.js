import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "foo/dist/": "./node_modules/foo/dist/",
    "foo": "./node_modules/foo/dist/es/rollup.js",
  },
  scopes: {},
}
assert({ actual, expected })
