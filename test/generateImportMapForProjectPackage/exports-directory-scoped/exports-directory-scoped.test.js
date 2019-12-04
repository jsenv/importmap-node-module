import { assert } from "@jsenv/assert"
import { fileUrlToPath } from "../../../src/internal/urlHelpers.js"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryPath = fileUrlToPath(import.meta.resolve("./"))

const actual = await generateImportMapForProjectPackage({
  projectDirectoryPath: testDirectoryPath,
  includeExports: true,
})
const expected = {
  imports: {
    "foo/ding": "./node_modules/foo/dong",
    foo: "./node_modules/foo/index.js",
  },
  scopes: {
    "./node_modules/foo/": {
      "exporting-folder/": "./node_modules/foo/node_modules/exporting-folder/",
      "exporting-folder": "./node_modules/foo/node_modules/exporting-folder/index.js",
    },
  },
}
assert({ actual, expected })
