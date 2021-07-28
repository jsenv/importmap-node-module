import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  dev: true,
})
const expected = {
  imports: {
    "@jsenv/core/conflict": "./root.js",
    "@jsenv/core/rootonly": "./rootonly.js",
    "@jsenv/core/deponly": "./node_modules/@jsenv/core/deponly.js",
    "@jsenv/core/": "./",
    "@jsenv/core": "./index.js",
  },
  scopes: {
    "./node_modules/@jsenv/core/": {
      "@jsenv/core/conflict": "./node_modules/@jsenv/core/dep.js",
      "@jsenv/core/": "./node_modules/@jsenv/core/",
      "@jsenv/core": "./node_modules/@jsenv/core/maindep.js",
    },
  },
}
assert({ actual, expected })
