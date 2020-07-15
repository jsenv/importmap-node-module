import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { generateImportMapForProject } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await generateImportMapForProject({
  logLevel: "error",
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {},
  scopes: {},
}
assert({ actual, expected })
