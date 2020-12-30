import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromNodeModules } from "../../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

{
  const importMap = await getImportMapFromNodeModules({
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
  const importMap = await getImportMapFromNodeModules({
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
