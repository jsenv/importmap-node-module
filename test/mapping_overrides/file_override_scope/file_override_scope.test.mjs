import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const test = async (options) => {
  const warnings = []
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        entryPointsToCheck: ["./index.mjs"],
        removeUnusedMappings: true,
        ...options,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning)
    },
    writeFiles: false,
  })
  return {
    warnings,
    importmap: importmaps["test.importmap"],
  }
}

const actual = await test({
  manualImportMap: {
    scopes: {
      "./node_modules/foo/": {
        "bar/button.css": "./node_modules/bar/button.css.js",
      },
    },
  },
})
const expected = {
  warnings: [],
  importmap: {
    imports: {
      foo: "./node_modules/foo/index.mjs",
    },
    scopes: {
      "./node_modules/foo/": {
        "bar/button.css": "./node_modules/bar/button.css.js",
      },
    },
  },
}
assert({ actual, expected })
