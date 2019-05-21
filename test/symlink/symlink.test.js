import { assert } from "@dmail/assert"
import { importMetaURLToFolderPath } from "../import-meta-url-to-folder-path.js"
import { generateImportMapForProjectNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const actual = await generateImportMapForProjectNodeModules({
  projectPath: testFolderPath,
  writeImportMapFile: false,
})
const expected = {
  imports: {
    "foo/": "/node_modules/foo/",
    foo: "/node_modules/foo/index.js",
  },
  scopes: {
    "/node_modules/foo/": {
      "/node_modules/foo/": "/node_modules/foo/",
      "/": "/node_modules/foo/",
    },
  },
}
assert({
  actual,
  expected,
})
