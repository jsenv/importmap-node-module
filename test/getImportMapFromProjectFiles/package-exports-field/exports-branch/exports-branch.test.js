import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const getImportMap = async ({ runtime, moduleFormat } = {}) => {
  return getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    jsFiles: false,
    moduleFormat,
    runtime,
    dev: true,
  })
}

{
  const actual = await getImportMap({
    runtime: "node",
  })
  const expected = {
    imports: {
      whatever: "./index",
      foo: "./node_modules/foo/main.js",
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
      whatever: "./index",
      foo: "./node_modules/foo/main.cjs",
    },
    scopes: {},
  }
  assert({ actual, expected })
}
