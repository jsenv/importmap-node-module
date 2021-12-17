import { assert } from "@jsenv/assert"
import { resolveUrl, urlToFileSystemPath } from "@jsenv/filesystem"

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
  const importedFileUrl = `${testDirectoryUrl}node_modules/leftpad/file`
  const actual = await test()
  const expected = {
    warnings: [
      {
        code: "IMPORT_RESOLUTION_FAILED",
        message: `Import resolution failed for "./file"
--- import trace ---
${testDirectoryUrl}node_modules/leftpad/index.js:1:7
> 1 | import "./file"
    |       ^
--- reason ---
file not found on filesystem at ${urlToFileSystemPath(importedFileUrl)}
--- suggestion 1 ---
update import specifier to "./file.js"
--- suggestion 2 ---
use magicExtensions: ["inherit"]
--- suggestion 3 ---
add mapping to "manualImportMap"
{
  "scopes": {
    "./node_modules/leftpad/": {
      "./node_modules/leftpad/file": "./node_modules/leftpad/file.js"
    }
  }
}`,
      },
    ],
    importmaps: {
      "test.importmap": {
        imports: {
          leftpad: "./node_modules/leftpad/index.js",
        },
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}

{
  const importedFileUrl = `${testDirectoryUrl}node_modules/leftpad/other-file`
  const actual = await test({
    magicExtensions: [".js"],
  })
  const expected = {
    warnings: [
      {
        code: "IMPORT_RESOLUTION_FAILED",
        message: `Import resolution failed for "./other-file"
--- import trace ---
${testDirectoryUrl}node_modules/leftpad/file.js:1:7
> 1 | import "./other-file"
    |       ^
--- reason ---
file not found on filesystem at ${urlToFileSystemPath(importedFileUrl)}`,
      },
    ],
    importmaps: {
      "test.importmap": {
        imports: {
          leftpad: "./node_modules/leftpad/index.js",
        },
        scopes: {
          "./node_modules/leftpad/": {
            "./node_modules/leftpad/file": "./node_modules/leftpad/file.js",
          },
        },
      },
    },
  }
  assert({ actual, expected })
}

{
  const actual = await test({
    magicExtensions: ["inherit", ".ts"],
  })
  const expected = {
    warnings: [],
    importmaps: {
      "test.importmap": {
        imports: {
          leftpad: "./node_modules/leftpad/index.js",
        },
        scopes: {
          "./node_modules/leftpad/": {
            "./node_modules/leftpad/other-file":
              "./node_modules/leftpad/other-file.ts",
            "./node_modules/leftpad/file": "./node_modules/leftpad/file.js",
          },
        },
      },
    },
  }
  assert({ actual, expected })
}
