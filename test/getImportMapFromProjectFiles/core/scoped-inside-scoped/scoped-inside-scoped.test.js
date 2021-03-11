import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  dev: true,
  jsFiles: false,
})
const expected = {
  imports: {
    "@jsenv/bundling": "./node_modules/@jsenv/bundling/whatever.js",
    "root": "./index",
  },
  scopes: {
    "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/": {
      "@dmail/project-structure":
        "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/node_modules/@dmail/project-structure/whatever.js",
    },
    "./node_modules/@jsenv/bundling/": {
      "@jsenv/core": "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/whatever.js",
    },
  },
}
assert({ actual, expected })
