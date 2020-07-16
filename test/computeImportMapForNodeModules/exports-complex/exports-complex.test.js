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
    "foo/dist/": "./node_modules/foo/dist/",
    "foo": "./node_modules/foo/dist/es/rollup.js",
  },
  scopes: {},
}
assert({ actual, expected })
