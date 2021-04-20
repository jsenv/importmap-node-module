import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    root: "./index.js",
    foo: "./node_modules/foo/index.js",
  },
  scopes: {
    "./node_modules/foo/": {
      "#env": "./node_modules/foo/env.prod.js",
    },
  },
}
assert({ actual, expected })
