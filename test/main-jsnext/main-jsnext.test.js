import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const actual = await generateImportMapForNodeModules({
  projectPath: testFolderPath,
  remapFolder: false,
})
const expected = {
  imports: {
    "main-jsnext": "/node_modules/main-jsnext/jsnext.js",
  },
  scopes: {},
}
assert({ actual, expected })
