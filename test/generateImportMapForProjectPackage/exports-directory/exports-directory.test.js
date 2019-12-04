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
    "@jsenv/whatever/": "./node_modules/@jsenv/whatever/",
    "@jsenv/whatever": "./node_modules/@jsenv/whatever/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
