import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  packagesSelfReference: false,
})
const expected = {
  imports: {
    "foo/ding": "./node_modules/foo/dong",
    "foo": "./node_modules/foo/index.js",
  },
  scopes: {
    "./node_modules/foo/node_modules/exporting-folder/": {
      "exporting-folder/": "./node_modules/foo/node_modules/exporting-folder/",
    },
    "./node_modules/foo/": {
      "exporting-folder/": "./node_modules/foo/node_modules/exporting-folder/",
      "exporting-folder": "./node_modules/foo/node_modules/exporting-folder/index.js",
    },
  },
}
assert({ actual, expected })
