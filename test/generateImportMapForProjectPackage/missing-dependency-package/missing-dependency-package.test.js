import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"
import { importMetaURLToFolderPath } from "../../importMetaUrlToFolderPath.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
// we could/should expected a console warning occurs
const actual = await generateImportMapForProjectPackage({
  projectPath: testFolderPath,
})
const expected = { imports: {}, scopes: {} }
assert({ actual, expected })
