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
    "foo/file.js": "/node_modules/foo/src/file.js",
    foo: "/node_modules/foo/foo.js",
  },
  scopes: {},
}
assert({ actual, expected })
