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

{
  const actual = await test({
    manualImportMap: {
      imports: {
        "root/": "./",
      },
    },
    entryPointsToCheck: ["./first/first.js", "second/second.js"],
    removeUnusedMappings: true,
  })
  const expected = {
    warnings: [],
    importmaps: {
      "test.importmap": {
        imports: {
          "root/": "./",
        },
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}
