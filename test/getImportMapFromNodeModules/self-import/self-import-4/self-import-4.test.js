import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromNodeModules } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await getImportMapFromNodeModules({
  projectDirectoryUrl: testDirectoryUrl,
  projectPackageDevDependenciesIncluded: true,
})
const expected = {
  imports: {
    "@jsenv/core/": "./",
    "@jsenv/core": "./index.js",
  },
  scopes: {
    "./node_modules/@jsenv/core/": {
      "@jsenv/core/": "./node_modules/@jsenv/core/",
    },
  },
}
assert({ actual, expected })
