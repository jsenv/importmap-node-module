import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"
import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const actual = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  jsFilesParsing: false,
})
const expected = {
  imports: {
    "main-without-extension/": "./node_modules/main-without-extension/",
    "main-without-extension": "./node_modules/main-without-extension/file.js",
    "root/": "./",
    "root": "./index",
  },
  scopes: {},
}
assert({ actual, expected })
