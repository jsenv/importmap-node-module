import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "foo/": "./node_modules/foo/",
    "root": "./index.js",
    "foo": "./node_modules/foo/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
