import { createLogger } from "@jsenv/logger"
import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { generateImportMapForNodeModules } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await generateImportMapForNodeModules({
  logger: createLogger(),
  projectDirectoryUrl: `${testDirectoryUrl}node_modules/project`,
  rootProjectDirectoryUrl: testDirectoryUrl,
})
const expected = {
  imports: {},
  scopes: {
    "./node_modules/project/": {
      "./node_modules/project/": "./node_modules/project/",
      "inside": "./node_modules/project/node_modules/inside/index.js",
      "shared": "./node_modules/shared/index.js",
      "./": "./node_modules/project/",
    },
  },
}
assert({ actual, expected })
