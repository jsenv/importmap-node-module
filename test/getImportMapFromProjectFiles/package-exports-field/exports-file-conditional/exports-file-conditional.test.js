import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"

import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

{
  const importMap = await getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    runtime: "browser",
    jsFilesParsing: false,
  })
  const actual = importMap
  const expected = {
    imports: {
      "foo/file.js": "./node_modules/foo/file.browser.js",
      "root/": "./",
      "root": "./index",
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
    runtime: "other",
    jsFilesParsing: false,
  })
  const actual = importMap
  const expected = {
    imports: {
      "foo/file.js": "./node_modules/foo/file.default.js",
      "root/": "./",
      "root": "./index",
    },
    scopes: {
      "./node_modules/foo/": {
        "foo/": "./node_modules/foo/",
      },
    },
  }
  assert({ actual, expected })
}
