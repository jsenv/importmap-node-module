import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromNodeModules } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

{
  const importMap = await getImportMapFromNodeModules({
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
  const importMap = await getImportMapFromNodeModules({
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
