import { assert } from "@jsenv/assert"
import { resolveUrl, urlToFileSystemPath } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

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
  warnings: [
    {
      code: "EXPORTS_WILDCARD",
      message: `Ignoring export using "*" because it is not supported by importmap.
--- key ---
foo/*
--- value ---
./node_modules/foo/*.js
--- package.json path ---
${urlToFileSystemPath(`${testDirectoryUrl}node_modules/foo/package.json`)}
--- see also ---
https://github.com/WICG/import-maps/issues/232`,
    },
  ],
  importMap: {
    imports: {
      root: "./index.js",
      foo: "./node_modules/foo/index.js",
    },
    scopes: {},
  },
}
assert({ actual, expected })
