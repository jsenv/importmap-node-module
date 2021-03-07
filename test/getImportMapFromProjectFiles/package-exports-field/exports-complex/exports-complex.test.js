import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const getImportMap = async ({ packagesExportsPreference } = {}) => {
  return getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    packagesSelfReference: false,
    packagesExportsPreference,
  })
}

{
  const actual = await getImportMap({
    packagesExportsPreference: ["node", "import", "require"],
  })
  const expected = {
    imports: {
      "foo/dist/": "./node_modules/foo/dist/",
      "foo": "./node_modules/foo/dist/es/rollup.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}

{
  const actual = await getImportMap({
    packagesExportsPreference: ["node", "require"],
  })
  const expected = {
    imports: {
      "foo/dist/": "./node_modules/foo/dist/",
      "foo": "./node_modules/foo/dist/rollup.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}

{
  const actual = await getImportMap({
    packagesExportsPreference: ["node"],
  })
  const expected = {
    imports: {
      "foo/dist/": "./node_modules/foo/dist/",
      "foo": "./node_modules/foo/file.cjs",
    },
    scopes: {},
  }
  assert({ actual, expected })
}

{
  const actual = await getImportMap()
  const expected = {
    imports: {
      "foo/dist/": "./node_modules/foo/dist/",
      "foo": "./node_modules/foo/dist/es/rollup.browser.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}
