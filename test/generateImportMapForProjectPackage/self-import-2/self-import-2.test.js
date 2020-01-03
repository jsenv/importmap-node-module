import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "root/": "./",
    "foo/": "./node_modules/foo/",
    "foo": "./node_modules/foo/index",
  },
  scopes: {},
}
assert({ actual, expected })
