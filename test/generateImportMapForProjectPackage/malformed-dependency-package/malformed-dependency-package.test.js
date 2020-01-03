import { assert } from "@jsenv/assert"

import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  logLevel: "off",
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "root/": "./",
  },
  scopes: {},
}
// we could/should also expect a console.warn occurs
assert({ actual, expected })
