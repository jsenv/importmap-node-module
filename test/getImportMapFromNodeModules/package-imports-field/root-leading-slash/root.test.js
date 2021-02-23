import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromNodeModules } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await getImportMapFromNodeModules({
  projectDirectoryUrl: `${testDirectoryUrl}node_modules/project`,
  rootProjectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {},
  scopes: {
    "./node_modules/project/node_modules/inside/": {
      "inside/": "./node_modules/project/node_modules/inside/",
    },
    "./node_modules/project/": {
      "./node_modules/project/": "./node_modules/project/",
      "project/": "./node_modules/project/",
      "project": "./node_modules/project/index.js",
      "inside": "./node_modules/project/node_modules/inside/index.js",
      "shared": "./node_modules/shared/index.js",
      "./": "./node_modules/project/",
    },
    "./node_modules/shared/": {
      "shared/": "./node_modules/shared/",
    },
  },
}
assert({ actual, expected })
