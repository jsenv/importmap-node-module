import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"
import { importMetaUrlToDirectoryPath } from "../../importMetaUrlToDirectoryPath.js"

const testDirectoryPath = importMetaUrlToDirectoryPath(import.meta.url)
const actual = await generateImportMapForProjectPackage({
  projectDirectoryPath: testDirectoryPath,
})
const expected = {
  imports: {
    "@jsenv/whatever/": "./node_modules/@jsenv/whatever/",
    "@jsenv/whatever": "./node_modules/@jsenv/whatever/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
