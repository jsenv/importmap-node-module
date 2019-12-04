import { assert } from "@jsenv/assert"
import { fileUrlToPath } from "../../../src/internal/urlHelpers.js"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryPath = fileUrlToPath(import.meta.resolve("./"))

const actual = await generateImportMapForProjectPackage({
  projectDirectoryPath: testDirectoryPath,
})
const expected = {
  imports: {
    bar: "./node_modules/bar/bar.js",
    foo: "./node_modules/foo/foo.js",
  },
  scopes: {
    "./node_modules/bar/": {
      foo: "./node_modules/foo/foo.js",
    },
    "./node_modules/foo/": {
      bar: "./node_modules/bar/bar.js",
    },
  },
}
assert({ actual, expected })
