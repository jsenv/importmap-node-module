import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const warnings = []
const importmaps = await writeImportMapFiles({
  // logLevel: "debug",
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./index.js"],
      bareSpecifierAutomapping: true,
      // magicExtensions: [".js"],
    },
  },
  writeFiles: false,
  onWarn: (warning) => {
    warnings.push(warning)
  },
})
const actual = {
  warnings,
  importmaps,
}
const expected = {
  warnings: [],
  importmaps: {
    "test.importmap": {
      imports: {
        "root/": "./",
        "root": "./index.js",
        "foo": "./node_modules/foo/index.js",
      },
      scopes: {
        "./node_modules/foo/": {
          file: "./node_modules/foo/file.js",
        },
      },
    },
  },
}
assert({ actual, expected })
