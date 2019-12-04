import { createLogger } from "@jsenv/logger"
import { assert } from "@jsenv/assert"
import { fileUrlToPath } from "../../../src/internal/urlHelpers.js"
import { generateImportMapForPackage } from "../../../index.js"

const testDirectoryPath = fileUrlToPath(import.meta.resolve("./"))

const actual = await generateImportMapForPackage({
  logger: createLogger(),
  projectDirectoryPath: `${testDirectoryPath}node_modules/project`,
  rootProjectDirectoryPath: testDirectoryPath,
  includeImports: true,
})
const expected = {
  imports: {},
  scopes: {
    "./node_modules/project/": {
      "./node_modules/project/": "./node_modules/project/",
      inside: "./node_modules/project/node_modules/inside/index.js",
      shared: "./node_modules/shared/index.js",
      "./": "./node_modules/project/",
    },
  },
}
assert({ actual, expected })
