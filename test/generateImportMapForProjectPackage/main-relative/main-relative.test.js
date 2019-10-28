import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"
import { importMetaUrlToDirectoryPath } from "../../importMetaUrlToDirectoryPath.js"

const testDirectoryPath = importMetaUrlToDirectoryPath(import.meta.url)
const actual = await generateImportMapForProjectPackage({
  projectDirectoryPath: testDirectoryPath,
})
const expected = {
  imports: {
    "main-relative": "./node_modules/main-relative/lib/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
