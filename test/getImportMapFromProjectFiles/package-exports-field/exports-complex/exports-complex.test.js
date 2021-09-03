import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"
import { getImportMapFromProjectFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const getImportMap = async ({ runtime, moduleFormat } = {}) => {
  return getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    jsFilesParsing: false,
    moduleFormat,
    runtime,
  })
}

{
  const actual = await getImportMap({
    runtime: "node",
  })
  const expected = {
    imports: {
      "foo/dist/": "./node_modules/foo/dist/",
      "whatever/": "./",
      "whatever": "./index",
      "foo": "./node_modules/foo/dist/rollup.mjs",
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
  const actual = await getImportMap({
    runtime: "node",
    moduleFormat: "cjs",
  })
  const expected = {
    imports: {
      "foo/dist/": "./node_modules/foo/dist/",
      "whatever/": "./",
      "whatever": "./index",
      "foo": "./node_modules/foo/dist/rollup.js",
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
  const actual = await getImportMap({
    runtime: "node",
    moduleFormat: "other",
  })
  const expected = {
    imports: {
      "foo/dist/": "./node_modules/foo/dist/",
      "whatever/": "./",
      "whatever": "./index",
      "foo": "./node_modules/foo/dist/rollup.browser.mjs",
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
  const actual = await getImportMap()
  const expected = {
    imports: {
      "foo/dist/": "./node_modules/foo/dist/",
      "whatever/": "./",
      "whatever": "./index",
      "foo": "./node_modules/foo/dist/rollup.browser.mjs",
    },
    scopes: {
      "./node_modules/foo/": {
        "foo/": "./node_modules/foo/",
      },
    },
  }
  assert({ actual, expected })
}
