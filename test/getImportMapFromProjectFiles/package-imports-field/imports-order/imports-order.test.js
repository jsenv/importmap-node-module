import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"
import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

{
  const testDirectoryUrl = resolveUrl("./import-first/", import.meta.url)
  const actual = await getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    runtime: "node",
  })
  const expected = {
    imports: {
      "#foo": "./import.js",
      "root": "./index.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}

{
  const testDirectoryUrl = resolveUrl("./node-first/", import.meta.url)
  const actual = await getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    runtime: "node",
  })
  const expected = {
    imports: {
      "#foo": "./node.js",
      "root": "./index.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}
