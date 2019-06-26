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
  const expected = new Error(`error while parsing package.json.
filename: ${testFolderPath}/node_modules/malformed/package.json
syntax error message: Unexpected end of JSON input`)
  assert({ actual, expected })
}
