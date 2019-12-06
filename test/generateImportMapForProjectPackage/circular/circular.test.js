import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
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
