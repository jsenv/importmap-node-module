import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { generateImportMapForProject } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await generateImportMapForProject({
  projectDirectoryUrl: testDirectoryUrl,
  packagesManualOverrides: {
    bar: {
      main: "bar.js",
      exports: {
        "./": "./",
      },
    },
  },
})
const expected = {
  imports: {
    "bar/": "./node_modules/bar/",
    "bar": "./node_modules/bar/bar.js",
  },
  scopes: {},
}
assert({ actual, expected })
