import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "main-folder-trailing": "./node_modules/main-folder-trailing/lib/index.js",
    "root/": "./",
  },
  scopes: {
    "./node_modules/main-folder-trailing/": {
      "main-folder-trailing/": "./node_modules/main-folder-trailing/",
    },
  },
}
assert({ actual, expected })
