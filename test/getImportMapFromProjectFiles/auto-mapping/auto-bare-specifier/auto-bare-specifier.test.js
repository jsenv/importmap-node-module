import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const warnings = []
const importmap = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  jsFilesParsing: true,
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
      code: "AUTO_MAPPING",
      message: `Auto mapping file to ./file.js.
--- specifier origin ---
${testDirectoryUrl}index.js:2:7
  1 | // eslint-disable-next-line import/no-unresolved
> 2 | import "file"
    |       ^
  3 |${" "}
--- suggestion ---
To get rid of this warning, add an explicit mapping into package.json.
{
  "exports": {
    "file": "./file.js"
  }
}
into ${testDirectoryUrl}package.json.`,
    },
  ],
  importmap: {
    imports: {
      file: "./file.js",
      root: "./index.js",
    },
    scopes: {},
  },
}
assert({ actual, expected })
