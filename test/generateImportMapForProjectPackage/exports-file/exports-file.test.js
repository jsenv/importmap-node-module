import { assert } from "@jsenv/assert"
import { fileUrlToPath } from "../../../src/internal/urlHelpers.js"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryPath = fileUrlToPath(import.meta.resolve("./"))

const importMap = await generateImportMapForProjectPackage({
  projectDirectoryPath: testDirectoryPath,
  includeExports: true,
})
const actual = importMap
const expected = {
  imports: {
    "foo/file.js": "./node_modules/foo/src/file.js",
    foo: "./node_modules/foo/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
