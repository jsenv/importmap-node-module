import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const importMap = await generateImportMapForProjectPackage({
  projectPath: testFolderPath,
})

const actual = importMap
const expected = {
  imports: {
    foo: "/node_modules/foo/index.js",
  },
  scopes: {
    "/node_modules/foo/": {
      "/node_modules/foo/": "/node_modules/foo/",
      "/": "/node_modules/foo/",
    },
  },
}
assert({ actual, expected })
