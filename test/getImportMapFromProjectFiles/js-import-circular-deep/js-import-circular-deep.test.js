import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const warnings = []
const importmap = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  onWarn: (warning) => {
    warnings.push(warning)
  },
})
const actual = {
  warnings,
  importmap,
}
const expected = {
  warnings: [],
  importmap: {
    imports: {
      root: "./index.js",
    },
    scopes: {},
  },
}
assert({ actual, expected })
