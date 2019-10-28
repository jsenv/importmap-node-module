import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"
import { importMetaUrlToDirectoryPath } from "../../importMetaUrlToDirectoryPath.js"

const testDirectoryPath = importMetaUrlToDirectoryPath(import.meta.url)
const actual = await generateImportMapForProjectPackage({
  projectDirectoryPath: testDirectoryPath,
})
const expected = {
  imports: {
    bar: "./node_modules/bar/bar.js",
    foo: "./node_modules/foo/foo.js",
  },
  scopes: {
    "./node_modules/bar/": {
      foo: "./node_modules/foo/foo.js",
    },
    "./node_modules/foo/": {
      bar: "./node_modules/bar/bar.js",
    },
  },
}
assert({ actual, expected })
