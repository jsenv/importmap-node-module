import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"
import { importMetaURLToFolderPath } from "../../importMetaUrlToFolderPath.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const actual = await generateImportMapForProjectPackage({
  projectPath: testFolderPath,
})
const expected = {
  imports: {
    "main-folder-trailing": "./node_modules/main-folder-trailing/lib/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
