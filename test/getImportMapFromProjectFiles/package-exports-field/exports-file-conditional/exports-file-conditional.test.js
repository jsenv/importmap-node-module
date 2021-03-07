import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

{
  const importMap = await getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    packagesExportsPreference: ["browser"],
    packagesSelfReference: false,
  })
  const actual = importMap
  const expected = {
    imports: {
      "foo/file.js": "./node_modules/foo/file.browser.js",
      "foo": "./node_modules/foo/index",
    },
    scopes: {},
  }
  assert({ actual, expected })
}

{
  const importMap = await getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    packagesExportsPreference: [],
    packagesSelfReference: false,
  })
  const actual = importMap
  const expected = {
    imports: {
      "foo/file.js": "./node_modules/foo/file.default.js",
      "foo": "./node_modules/foo/index",
    },
    scopes: {},
  }
  assert({ actual, expected })
}
