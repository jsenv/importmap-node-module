import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { generateImportMapForProject } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

{
  const importMap = await generateImportMapForProject({
    projectDirectoryUrl: testDirectoryUrl,
    packagesExportsPreference: ["browser"],
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
  const importMap = await generateImportMapForProject({
    projectDirectoryUrl: testDirectoryUrl,
    packagesExportsPreference: [],
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
