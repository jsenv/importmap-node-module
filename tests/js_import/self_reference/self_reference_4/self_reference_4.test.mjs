import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/urls"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
      entryPointsToCheck: ["./index.js"],
    },
  },
  writeFiles: false,
})

const actual = importmaps["test.importmap"]
const expected = {
  imports: {
    "@jsenv/core/": "./",
    "@jsenv/core": "./index.js",
  },
  scopes: {
    "./node_modules/@jsenv/core/": {
      "@jsenv/core/": "./node_modules/@jsenv/core/",
    },
  },
}
assert({ actual, expected })
