import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { computeImportMapForNodeModules } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await computeImportMapForNodeModules({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "root/": "./",
    "root": "./index.js",
    "foo": "./node_modules/foo/index.js",
  },
  scopes: {
    "./node_modules/foo/": {
      "./node_modules/foo/": "./node_modules/foo/",
      "foo/": "./node_modules/foo/",
      "./": "./node_modules/foo/",
    },
  },
}
assert({ actual, expected })
