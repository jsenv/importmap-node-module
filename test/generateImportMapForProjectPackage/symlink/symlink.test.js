import { assert } from "@jsenv/assert"
import { fileUrlToPath } from "../../../src/internal/urlHelpers.js"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryPath = fileUrlToPath(import.meta.resolve("./"))

const actual = await generateImportMapForProjectPackage({
  projectDirectoryPath: testDirectoryPath,
  includeImports: true,
})
const expected = {
  imports: {
    foo: "./node_modules/foo/index.js",
  },
  scopes: {
    "./node_modules/foo/": {
      "./node_modules/foo/": "./node_modules/foo/",
      "./": "./node_modules/foo/",
    },
  },
}
assert({ actual, expected })
