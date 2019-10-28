import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"
import { importMetaURLToDirectoryPath } from "../../importMetaURLToDirectoryPath.js"

const testDirectoryPath = importMetaURLToDirectoryPath(import.meta.url)
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
