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
    "foo": "./node_modules/foo/index",
  },
  scopes: {
    "./node_modules/foo/node_modules/bar/": {
      "bar/file.js": "./node_modules/foo/node_modules/bar/src/file.js",
      "bar/": "./node_modules/foo/node_modules/bar/",
    },
    "./node_modules/foo/": {
      "bar/file.js": "./node_modules/foo/node_modules/bar/src/file.js",
      "foo/": "./node_modules/foo/",
      "bar": "./node_modules/foo/node_modules/bar/index",
    },
  },
}
assert({ actual, expected })
