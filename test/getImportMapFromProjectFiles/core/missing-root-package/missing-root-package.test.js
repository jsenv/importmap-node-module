import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const packageFileUrl = resolveUrl("./package.json", testDirectoryUrl)

const warnings = []
const importmap = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  jsFilesParsing: false,
  onWarn: (warning) => {
    warnings.push(warning)
  },
})

const actual = {
  warnings,
  importmap,
}
const expected = {
  warnings: [
    {
      code: "PROJECT_PACKAGE_FILE_NOT_FOUND",
      message: `Cannot find project package.json file.
--- package.json url ---
${packageFileUrl}`,
    },
  ],
  importmap: {},
}
assert({ actual, expected })
