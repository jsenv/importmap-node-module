import { assert } from "@jsenv/assert"

import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  logLevel: "error",
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "root/": "./",
  },
  scopes: {},
}
assert({ actual, expected })
