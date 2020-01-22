import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "main-relative": "./node_modules/main-relative/lib/index.js",
    "root/": "./",
  },
  scopes: {
    "./node_modules/main-relative/": {
      "main-relative/": "./node_modules/main-relative/",
    },
  },
}
assert({ actual, expected })
