import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
// we could/should expected a console warning occurs
const actual = await generateImportMapForProjectPackage({
  projectPath: testFolderPath,
})
const expected = { imports: {}, scopes: {} }
assert({ actual, expected })
