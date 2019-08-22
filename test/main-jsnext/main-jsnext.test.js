import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForProjectNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const actual = await generateImportMapForProjectNodeModules({
  projectPath: testFolderPath,
  writeImportMapFile: false,
  writeJsconfigFile: false,
  scopeOriginRelativePerModule: false,
  remapFolder: false,
})
const expected = {
  imports: {
    "main-jsnext": "/node_modules/main-jsnext/jsnext.js",
  },
  scopes: {},
}
assert({ actual, expected })
