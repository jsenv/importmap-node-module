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
      "foo/file.js": "./node_modules/foo/file.browser.js",
      "root/": "./",
      "foo": "./node_modules/foo/index",
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
  const importMap = await generateImportMapForProjectPackage({
    projectDirectoryUrl: testDirectoryUrl,
    includeExports: true,
  })
  const actual = importMap
  const expected = {
    imports: {
      "foo/file.js": "./node_modules/foo/file.default.js",
      "root/": "./",
      "foo": "./node_modules/foo/index",
    },
    scopes: {
      "./node_modules/foo/": {
        "foo/": "./node_modules/foo/",
      },
    },
  }
  assert({ actual, expected })
}
