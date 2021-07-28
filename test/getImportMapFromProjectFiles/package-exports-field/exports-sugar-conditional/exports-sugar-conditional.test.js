import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

{
  const importMap = await getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    runtime: "node",
  })
  const actual = importMap
  const expected = {
    imports: {
      root: "./index",
      foo: "./node_modules/foo/index.default.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}

{
  const importMap = await getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    runtime: "browser",
  })
  const actual = importMap
  const expected = {
    imports: {
      root: "./index",
      foo: "./node_modules/foo/index.browser.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}
