import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { generateImportMapForProject } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await generateImportMapForProject({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "main-without-extension": "./node_modules/main-without-extension/file.js",
  },
  scopes: {},
}
assert({ actual, expected })
