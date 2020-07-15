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
      foo: "./node_modules/foo/index.browser.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}

{
  const importMap = await generateImportMapForProject({
    projectDirectoryUrl: testDirectoryUrl,
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
