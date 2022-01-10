import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const test = async (params) => {
  const warnings = []
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        ...params,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning)
    },
    writeFiles: false,
  })
  return { warnings, importmaps }
}

const actual = await test({
  manualImportMap: {
    imports: {
      foo: "./foo.js",
    },
  },
  entryPointsToCheck: ["./main.html"],
  removeUnusedMappings: true,
})
const expected = {
  warnings: [],
  importmaps: {
    "test.importmap": {
      imports: {
        foo: "./foo.js",
      },
      scopes: {},
    },
  },
}
assert({ actual, expected })
