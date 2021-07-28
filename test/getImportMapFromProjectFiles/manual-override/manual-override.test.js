import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"

import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  packagesManualOverrides: {
    bar: {
      exports: {
        ".": "bar.js",
        "./": "./",
      },
    },
  },
  jsFilesParsing: false,
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
