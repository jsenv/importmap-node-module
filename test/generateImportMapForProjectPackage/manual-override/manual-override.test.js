import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
  manualOverrides: {
    bar: {
      main: "bar.js",
      exports: {
        "./": "./",
      },
    },
  },
})
const expected = {
  imports: {
    "root/": "./",
    "bar/": "./node_modules/bar/",
    "bar": "./node_modules/bar/bar.js",
  },
  scopes: {},
}
assert({ actual, expected })
