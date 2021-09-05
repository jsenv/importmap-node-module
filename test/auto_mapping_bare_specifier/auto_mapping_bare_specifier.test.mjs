import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const test = async ({ bareSpecifierAutomapping = false } = {}) => {
  const warnings = []
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        removeUnusedMappings: true,
        bareSpecifierAutomapping,
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
  const actual = await test()
  const expected = {
    warnings: [
      {
        code: "IMPORT_RESOLUTION_FAILED",
        message: `Import resolution failed for "file"
--- import source ---
${testDirectoryUrl}index.js:2:7
  1 | // eslint-disable-next-line import/no-unresolved
> 2 | import "file"
    |       ^
  3 |${" "}
--- reason ---
there is no mapping for this bare specifier
--- suggestion 1 ---
update import specifier to "./file.js"
--- suggestion 2 ---
enable "bareSpecifierAutomapping"
--- suggestion 3 ---
add mapping to "initialImportMap"
{
  "imports": {
    "file": "./file.js"
  }
}`,
      },
    ],
    importmaps: {
      "test.importmap": {
        imports: {
          root: "./index.js",
        },
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}

{
  const actual = await test({ bareSpecifierAutomapping: true })
  const expected = {
    warnings: [],
    importmaps: {
      "test.importmap": {
        imports: {
          file: "./file.js",
          root: "./index.js",
        },
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}
