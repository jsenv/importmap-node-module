import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const test = async ({ magicExtensions, packagesManualOverrides } = {}) => {
  const warnings = []
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        entryPointsToCheck: ["./main.js"],
        removeUnusedMappings: true,
        magicExtensions,
      },
    },
    packagesManualOverrides,
    onWarn: (warning) => {
      warnings.push(warning)
    },
    writeFiles: false,
  })
  return { warnings, importmaps }
}

{
  const actual = await test({
    magicExtensions: [".ts"],
    packagesManualOverrides: {
      lodash: {
        exports: {
          "./*": "./*",
        },
      },
    },
  })
  const expected = {
    warnings: [],
    importmaps: {
      "test.importmap": {
        imports: {
          "lodash/union": "./node_modules/lodash/union.js",
          "lodash/": "./node_modules/lodash/",
        },
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}
