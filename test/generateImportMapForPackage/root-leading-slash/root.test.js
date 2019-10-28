import { createLogger } from "@jsenv/logger"
import { assert } from "@dmail/assert"
import { generateImportMapForPackage } from "../../../index.js"
import { importMetaUrlToDirectoryPath } from "../../importMetaUrlToDirectoryPath.js"

const testDirectoryPath = importMetaUrlToDirectoryPath(import.meta.url)

const actual = await generateImportMapForPackage({
  logger: createLogger(),
  projectDirectoryPath: `${testDirectoryPath}/node_modules/project`,
  rootProjectDirectoryPath: testDirectoryPath,
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
