
import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const test = async () => {
  const warnings = []
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        initialImportMap: {
          imports: {
            "http://example.com/foo.js": "http://example.com/bar.js",
          },
        },
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
    warnings: [],
    importmaps: {
      "test.importmap": {
        imports: {
          "http://example.com/foo.js": "http://example.com/bar.js",
        },
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}
