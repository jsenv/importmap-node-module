import { assert } from "@jsenv/assert"

import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "main-undefined/": "./node_modules/main-undefined/",
    "main-undefined": "./node_modules/main-undefined/index.js",
    "root/": "./",
  },
  scopes: {},
}
assert({ actual, expected })
