import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "main-directory": "./node_modules/main-directory/lib/index.js",
    "root/": "./",
  },
  scopes: {
    "./node_modules/main-directory/": {
      "main-directory/": "./node_modules/main-directory/",
    },
  },
}
assert({ actual, expected })
