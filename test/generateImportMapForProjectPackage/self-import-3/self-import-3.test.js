import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "whatever/boo": "./lib/boo.js",
    "whatever/": "./",
    "foo/bar": "./node_modules/foo/src/bar.js",
    "foo/": "./node_modules/foo/",
    "foo": "./node_modules/foo/index",
  },
  scopes: {},
}
assert({ actual, expected })
