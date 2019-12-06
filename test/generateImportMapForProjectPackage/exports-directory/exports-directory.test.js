import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
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
