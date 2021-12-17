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
        mappingsForNodeResolution: true,
        entryPointsToCheck: ["./main.js"],
        removeUnusedMappings: true,
        magicExtensions: ["inherit"],
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
  magicExtensions: [".ts"],
})
const expected = {
  warnings: [],
  importmaps: {
    "test.importmap": {
      imports: {
        "./file.css": "./file.css.js",
      },
      scopes: {},
    },
  },
}
assert({ actual, expected })
