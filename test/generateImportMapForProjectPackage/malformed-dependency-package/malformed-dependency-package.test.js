import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"
import { importMetaUrlToDirectoryPath } from "../../importMetaUrlToDirectoryPath.js"

const testDirectoryPath = importMetaUrlToDirectoryPath(import.meta.url)
const actual = await generateImportMapForProjectPackage({
  projectDirectoryPath: testDirectoryPath,
})
const expected = { imports: {}, scopes: {} }
// we could/should also expect a console.warn occurs
assert({ actual, expected })
