import { assert } from "@jsenv/assert"
import { fileUrlToPath } from "../../../src/internal/urlHelpers.js"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryPath = fileUrlToPath(import.meta.resolve("./"))

const actual = await generateImportMapForProjectPackage({
  projectDirectoryPath: testDirectoryPath,
})
const expected = {
  imports: {
    "@dmail/yo": "./node_modules/@dmail/yo/index.js",
    bar: "./node_modules/bar/bar.js",
    foo: "./node_modules/foo/foo.js",
  },
  scopes: {
    "./node_modules/foo/": {
      bar: "./node_modules/foo/node_modules/bar/index.js",
    },
  },
}
assert({ actual, expected })
