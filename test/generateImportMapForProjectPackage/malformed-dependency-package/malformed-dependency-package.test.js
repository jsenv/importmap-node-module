import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await generateImportMapForProjectPackage({
  logLevel: "off",
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {},
  scopes: {},
}
// we could/should also expect a console.warn occurs
assert({ actual, expected })
