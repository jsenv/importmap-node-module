import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const warnings = []
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "./src/directory/test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./src/directory/main.js"],
      removeUnusedMappings: true,
      magicExtensions: [".js"],
      manualImportMap: {
        imports: {
          "directory/": "./src/directory/",
        },
      },
    },
  },
  onWarn: (warning) => {
    warnings.push(warning)
  },
  writeFiles: false,
})

{
  const actual = {
    warnings,
    importmaps,
  }
  const expected = {
    warnings: [],
    importmaps: {
      "./src/directory/test.importmap": {
        imports: {
          "directory/": "./",
          "example": "../../node_modules/example/index.js",
        },
        scopes: {
          "../../node_modules/example/": {
            "../../node_modules/example/file":
              "../../node_modules/example/file.js",
          },
        },
      },
    },
  }
  assert({ actual, expected })
}
