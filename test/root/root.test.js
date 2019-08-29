import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)

const actual = await generateImportMapForNodeModules({
  projectPath: `${testFolderPath}/node_modules/project`,
  rootProjectPath: testFolderPath,
})
const expected = {
  imports: {},
  scopes: {
    "/node_modules/project/": {
      "/node_modules/project/": "/node_modules/project/",
      scoped: "/node_modules/project/node_modules/scoped/index.js",
      shared: "/node_modules/shared/index.js",
      "/": "/",
    },
  },
}
assert({ actual, expected })
