import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  jsFiles: false,
})
const expected = {
  imports: {
    "main-relative": "./node_modules/main-relative/lib/index.js",
    "root/": "./",
    "root": "./index",
  },
  scopes: {
    "./node_modules/main-relative/": {
      "main-relative/": "./node_modules/main-relative/",
    },
  },
}
assert({ actual, expected })
