import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

{
  const importMap = await getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    runtime: "node",
    jsFiles: false,
  })
  const actual = importMap
  const expected = {
    imports: {
      "root/": "./",
      "root": "./index",
      "foo": "./node_modules/foo/feature-node.mjs",
    },
    scopes: {
      "./node_modules/foo/": {
        "foo/": "./node_modules/foo/",
      },
    },
  }
  assert({ actual, expected })
}

{
  const importMap = await getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    runtime: "browser",
    jsFiles: false,
  })
  const actual = importMap
  const expected = {
    imports: {
      "root/": "./",
      "root": "./index",
      "foo": "./node_modules/foo/feature.mjs",
    },
    scopes: {
      "./node_modules/foo/": {
        "foo/": "./node_modules/foo/",
      },
    },
  }
  assert({ actual, expected })
}
