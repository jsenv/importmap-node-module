import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForProjectNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
try {
  await generateImportMapForProjectNodeModules({
    projectPath: testFolderPath,
    throwUnhandled: false,
  })
  throw new Error("should throw")
} catch (actual) {
  const expected = new Error(`missing package.json.
path: ${testFolderPath}/package.json`)
  assert({ actual, expected })
}
