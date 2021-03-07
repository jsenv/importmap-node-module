import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

{
  const importMap = await getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    packagesExportsPreference: ["node"],
    packagesSelfReference: false,
  })
  const actual = importMap
  const expected = {
    imports: {
      foo: "./node_modules/foo/index.default.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}

{
  const importMap = await getImportMapFromProjectFiles({
    projectDirectoryUrl: testDirectoryUrl,
    packagesExportsPreference: ["browser"],
    packagesSelfReference: false,
  })
  const actual = importMap
  const expected = {
    imports: {
      foo: "./node_modules/foo/index.browser.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}
