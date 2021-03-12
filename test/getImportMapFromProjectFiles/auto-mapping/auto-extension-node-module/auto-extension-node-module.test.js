import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const warnings = []
const importmap = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  jsFiles: true,
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
      message: `Auto mapping ./file to ./node_modules/leftpad/file.js.
--- specifier origin ---
${testDirectoryUrl}node_modules/leftpad/index.js:1:7
> 1 | import "./file"
    |       ^
--- suggestion ---
To get rid of this warning, add an explicit mapping into package.json.
{
  "exports": {
    "./file": "./file.js"
  }
}
into ${testDirectoryUrl}node_modules/leftpad/package.json.`,
    },
    {
      code: "AUTO_MAPPING",
      message: `Auto mapping ./other-file to ./node_modules/leftpad/other-file.ts.
--- specifier origin ---
${testDirectoryUrl}node_modules/leftpad/file.js:1:7
> 1 | import "./other-file"
    |       ^
--- suggestion ---
To get rid of this warning, add an explicit mapping into package.json.
{
  "exports": {
    "./other-file": "./other-file.ts"
  }
}
into ${testDirectoryUrl}node_modules/leftpad/package.json.`,
    },
  ],
  importmap: {
    imports: {
      leftpad: "./node_modules/leftpad/index.js",
      root: "./main.js",
    },
    scopes: {
      "./node_modules/leftpad/": {
        "./other-file": "./node_modules/leftpad/other-file.ts",
        "./file": "./node_modules/leftpad/file.js",
      },
    },
  },
}
assert({ actual, expected })
