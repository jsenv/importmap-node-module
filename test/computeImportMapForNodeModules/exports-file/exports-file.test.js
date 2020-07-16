import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { computeImportMapForNodeModules } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const importMap = await computeImportMapForNodeModules({
  projectDirectoryUrl: testDirectoryUrl,
  packagesSelfImport: false,
})
const actual = importMap
const expected = {
  imports: {
    "foo/file.js": "./node_modules/foo/src/file.js",
    "foo": "./node_modules/foo/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
