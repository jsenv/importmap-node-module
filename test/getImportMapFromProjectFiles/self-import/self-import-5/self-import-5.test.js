import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"

import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  dev: true,
})
const expected = {
  imports: {
    "@jsenv/core/": "./",
    "@jsenv/core": "./index",
  },
  scopes: {
    "./node_modules/@jsenv/core/": {
      "@jsenv/core/": "./node_modules/@jsenv/core/",
      "@jsenv/core": "./node_modules/@jsenv/core/index",
    },
  },
}
assert({ actual, expected })
