import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/urls"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const consoleError = console.error
console.error = () => {}
try {
  const warnings = []
  const importmaps = await writeImportMapFiles({
    logLevel: "off",
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        entryPointsToCheck: ["./index.js"],
        removeUnusedMappings: true,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning)
    },
    writeFiles: false,
  })
  const actual = {
    warnings,
    importmaps,
  }
  const expected = {
    warnings: [],
    importmaps: {
      "test.importmap": {
        imports: {},
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
} finally {
  console.error = consoleError
}
