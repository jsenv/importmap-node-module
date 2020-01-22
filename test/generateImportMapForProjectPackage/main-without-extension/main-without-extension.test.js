import { assert } from "@jsenv/assert"

import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "main-without-extension": "./node_modules/main-without-extension/file.js",
    "root/": "./",
  },
  scopes: {
    "./node_modules/main-without-extension/": {
      "main-without-extension/": "./node_modules/main-without-extension/",
    },
  },
}
assert({ actual, expected })
