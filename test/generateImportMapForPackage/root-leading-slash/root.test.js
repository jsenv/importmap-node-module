import { createLogger } from "@jsenv/logger"
import { assert } from "@jsenv/assert"
import { resolveUrl } from '@jsenv/util'
import { generateImportMapForPackage } from "../../../index.js"

const testDirectoryUrl = resolveUrl('./', import.meta.url)

const actual = await generateImportMapForPackage({
  logger: createLogger(),
  projectDirectoryUrl: `${testDirectoryUrl}node_modules/project`,
  rootProjectDirectoryUrl: testDirectoryUrl,
  includeImports: true,
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
