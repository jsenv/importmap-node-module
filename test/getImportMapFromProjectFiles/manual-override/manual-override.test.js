import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  packagesManualOverrides: {
    bar: {
      main: "bar.js",
      exports: {
        "./": "./",
      },
    },
  },
  jsFiles: false,
})
const expected = {
  imports: {
    "root/": "./",
    "bar/": "./node_modules/bar/",
    "root": "./index",
    "bar": "./node_modules/bar/bar.js",
  },
  scopes: {},
}
assert({ actual, expected })
