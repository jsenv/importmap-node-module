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
    "main-without-extension": "./node_modules/main-without-extension/file.js",
    "root/": "./",
    "root": "./index",
  },
  scopes: {
    "./node_modules/main-without-extension/": {
      "main-without-extension/": "./node_modules/main-without-extension/",
    },
  },
}
assert({ actual, expected })
