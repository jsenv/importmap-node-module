import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"

import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const warnings = []
const importMap = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  onWarn: (warning) => {
    warnings.push(warning)
  },
})
const actual = {
  warnings,
  importMap,
}
const expected = {
  warnings: [],
  importMap: {
    imports: {
      root: "./index.js",
      foo: "./node_modules/foo/index.js",
    },
    scopes: {
      "./node_modules/foo/": {
        file: "./node_modules/foo/file.js",
      },
    },
  },
}
assert({ actual, expected })
