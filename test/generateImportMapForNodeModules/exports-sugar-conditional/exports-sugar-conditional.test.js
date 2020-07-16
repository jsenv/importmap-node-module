import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { generateImportMapForNodeModules } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

{
  const importMap = await generateImportMapForNodeModules({
    projectDirectoryUrl: testDirectoryUrl,
    packagesExportsPreference: ["browser"],
    packagesSelfImport: false,
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

{
  const importMap = await generateImportMapForNodeModules({
    projectDirectoryUrl: testDirectoryUrl,
    packagesSelfImport: false,
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
