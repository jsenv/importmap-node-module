import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"

import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const getImportMap = async (options) => {
  return getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    jsFilesParsing: false,
    dev: true,
    ...options,
  })
}

{
  const actual = await getImportMap({
    runtime: "node",
  })
  const expected = {
    imports: {
      "whatever/": "./",
      "whatever": "./main.mjs",
    },
    scopes: {},
  }
  assert({ actual, expected })
}

{
  const actual = await getImportMap({
    runtime: "node",
    moduleFormat: "cjs",
  })
  const expected = {
    imports: {
      "whatever/": "./",
      "whatever": "./main-2.cjs",
    },
    scopes: {},
  }
  assert({ actual, expected })
}
