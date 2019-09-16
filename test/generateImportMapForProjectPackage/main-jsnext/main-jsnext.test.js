import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const actual = await generateImportMapForProjectPackage({
  projectPath: testFolderPath,
})
const expected = {
  imports: {
    "main-jsnext": "/node_modules/main-jsnext/jsnext.js",
  },
  scopes: {},
}
assert({ actual, expected })
