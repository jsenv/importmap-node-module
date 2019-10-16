import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { createLogger } from "@jsenv/logger"
import { assert } from "@dmail/assert"
import { generateImportMapForPackage } from "../../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)

const actual = await generateImportMapForPackage({
  projectPath: `${testFolderPath}/node_modules/project`,
  rootProjectPath: testFolderPath,
  logger: createLogger(),
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
