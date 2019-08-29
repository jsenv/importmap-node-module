import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const importMap = await generateImportMapForNodeModules({
  projectPath: testFolderPath,
})

const actual = importMap
const expected = {
  imports: {
    "foo/": "/node_modules/foo/",
    foo: "/node_modules/foo/index.js",
  },
  scopes: {},
}
assert({ actual, expected })
