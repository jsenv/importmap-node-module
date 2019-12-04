import { assert } from "@jsenv/assert"
import { fileUrlToPath } from "../../../src/internal/urlHelpers.js"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryPath = fileUrlToPath(import.meta.resolve("./"))

const actual = await generateImportMapForProjectPackage({
  logLevel: "error",
  projectDirectoryPath: testDirectoryPath,
})
const expected = { imports: {}, scopes: {} }
assert({ actual, expected })
