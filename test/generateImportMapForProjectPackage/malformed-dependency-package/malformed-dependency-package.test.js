import { assert } from "@jsenv/assert"
import { fileUrlToPath } from "../../../src/internal/urlHelpers.js"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryPath = fileUrlToPath(import.meta.resolve("./"))

const actual = await generateImportMapForProjectPackage({
  logLevel: "off",
  projectDirectoryPath: testDirectoryPath,
})
const expected = { imports: {}, scopes: {} }
// we could/should also expect a console.warn occurs
assert({ actual, expected })
