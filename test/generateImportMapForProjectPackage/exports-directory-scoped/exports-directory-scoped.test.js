import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
  includeExports: true,
})
const expected = {
  imports: {
    "foo/ding": "./node_modules/foo/dong",
    "foo": "./node_modules/foo/index.js",
  },
  scopes: {
    "./node_modules/foo/": {
      "exporting-folder/": "./node_modules/foo/node_modules/exporting-folder/",
      "exporting-folder": "./node_modules/foo/node_modules/exporting-folder/index.js",
    },
  },
}
assert({ actual, expected })
