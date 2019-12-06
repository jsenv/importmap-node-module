import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "main-jsnext": "./node_modules/main-jsnext/jsnext.js",
  },
  scopes: {},
}
assert({ actual, expected })
