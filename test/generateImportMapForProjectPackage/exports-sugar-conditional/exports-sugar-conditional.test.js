import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

{
  const importMap = await generateImportMapForProjectPackage({
    projectDirectoryUrl: testDirectoryUrl,
    includeExports: true,
    favoredExports: ["browser"],
  })
  const actual = importMap
  const expected = {
    imports: {
      "root/": "./",
      "foo/": "./node_modules/foo/",
      "foo": "./node_modules/foo/index.browser.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}

{
  const importMap = await generateImportMapForProjectPackage({
    projectDirectoryUrl: testDirectoryUrl,
    includeExports: true,
  })
  const actual = importMap
  const expected = {
    imports: {
      "root/": "./",
      "foo/": "./node_modules/foo/",
      "foo": "./node_modules/foo/index.default.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}
