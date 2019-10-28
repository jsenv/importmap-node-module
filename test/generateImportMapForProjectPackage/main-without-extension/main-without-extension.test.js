import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"
import { importMetaURLToDirectoryPath } from "../../importMetaURLToDirectoryPath.js"

const testDirectoryPath = importMetaURLToDirectoryPath(import.meta.url)
const actual = await generateImportMapForProjectPackage({
  projectDirectoryPath: testDirectoryPath,
})
const expected = {
  imports: {
    "main-without-extension": "./node_modules/main-without-extension/file.js",
  },
  scopes: {},
}
assert({ actual, expected })
