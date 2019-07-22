import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForProjectNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
try {
  await generateImportMapForProjectNodeModules({
    projectPath: testFolderPath,
    writeImportMapFile: false,
    scopeOriginRelativePerModule: false,
    remapFolder: false,
    throwUnhandled: false,
  })
  throw new Error("should throw")
} catch (actual) {
  const expected = new Error(`node module not found.
node module name: not-found
importer path: ${testFolderPath}/package.json
project path : ${testFolderPath}`)
  assert({ actual, expected })
}
