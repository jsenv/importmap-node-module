import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "whatever/": "./",
    "bar": "./node_modules/bar/bar.js",
    "foo": "./node_modules/foo/foo.js",
  },
  scopes: {
    "./node_modules/bar/": {
      "bar/": "./node_modules/bar/",
    },
    "./node_modules/foo/": {
      "foo/": "./node_modules/foo/",
    },
  },
}
assert({ actual, expected })
