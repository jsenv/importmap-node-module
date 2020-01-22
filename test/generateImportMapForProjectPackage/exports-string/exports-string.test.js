import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const importMap = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
  includeExports: true,
})
const actual = importMap
const expected = {
  imports: {
    "root/": "./",
    "foo": "./node_modules/foo/foo.js",
  },
  scopes: {
    "./node_modules/foo/": {
      "foo/": "./node_modules/foo/",
    },
  },
}
assert({ actual, expected })
