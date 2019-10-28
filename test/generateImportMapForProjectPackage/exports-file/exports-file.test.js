import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"
import { importMetaUrlToDirectoryPath } from "../../importMetaUrlToDirectoryPath.js"

const testDirectoryPath = importMetaUrlToDirectoryPath(import.meta.url)
const importMap = await generateImportMapForProjectPackage({
  projectDirectoryPath: testDirectoryPath,
})
const actual = importMap
const expected = {
  imports: {
    "foo/file.js": "./node_modules/foo/src/file.js",
    foo: "./node_modules/foo/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
