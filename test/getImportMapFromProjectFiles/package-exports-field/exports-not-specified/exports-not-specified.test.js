import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"

import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  jsFilesParsing: true,
})
const expected = {
  imports: {
    "whatever": "./index.js",
    "foo/": "./node_modules/foo/",
  },
  scopes: {},
}
assert({ actual, expected })
