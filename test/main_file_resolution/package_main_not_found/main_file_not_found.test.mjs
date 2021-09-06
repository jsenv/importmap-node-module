import { assert } from "@jsenv/assert"
import { resolveUrl, urlToFileSystemPath } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const rootPackageFileUrl = resolveUrl("./package.json", testDirectoryUrl)
const test = async () => {
  const warnings = []
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        removeUnusedMappings: true,
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
        code: "PROJECT_ENTRY_POINT_RESOLUTION_FAILED",
        message: `Cannot find project entry point
--- reason ---
Cannot find package main file "./index"
--- package.json path ---
${urlToFileSystemPath(rootPackageFileUrl)}
--- extensions tried ---
.js, .json, .node`,
      },
    ],
    importmaps: {
      "test.importmap": {
        imports: {},
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}
