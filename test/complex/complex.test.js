import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const actual = await generateImportMapForNodeModules({
  projectPath: testFolderPath,
  onWarn: () => {},
})
// this is just to ensure it does not throw
const expected = actual
assert({ actual, expected })
