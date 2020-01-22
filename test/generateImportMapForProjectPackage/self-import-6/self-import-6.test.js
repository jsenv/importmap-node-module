import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {
    "@jsenv/core/conflict": "./root.js",
    "@jsenv/core/rootonly": "./rootonly.js",
    "@jsenv/core/deponly": "./node_modules/@jsenv/core/deponly.js",
    "@jsenv/core/": "./",
    "@jsenv/core": "./node_modules/@jsenv/core/maindep.js",
  },
  scopes: {
    "./node_modules/@jsenv/core/": {
      "@jsenv/core/conflict": "./node_modules/@jsenv/core/dep.js",
      "@jsenv/core/": "./node_modules/@jsenv/core/",
    },
  },
}
assert({ actual, expected })
