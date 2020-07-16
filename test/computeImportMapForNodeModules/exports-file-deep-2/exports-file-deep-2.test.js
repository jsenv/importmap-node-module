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
    foo: "./node_modules/foo/index",
  },
  scopes: {
    "./node_modules/foo/node_modules/bar/": {
      "bar/file.js": "./node_modules/foo/node_modules/bar/src/file.js",
    },
    "./node_modules/foo/": {
      "bar/file.js": "./node_modules/foo/node_modules/bar/src/file.js",
      "bar": "./node_modules/foo/node_modules/bar/index",
    },
  },
}
assert({ actual, expected })
