import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
try {
  await generateImportMapForNodeModules({
    projectPath: testFolderPath,
    throwUnhandled: false,
  })
  throw new Error("should throw")
} catch (actual) {
  const expected = new SyntaxError(`error while parsing dependency package.json.
--- parsing error message ---
Unexpected end of JSON input
--- package.json path ---
${testFolderPath}/node_modules/malformed/package.json`)
  assert({ actual, expected })
}
