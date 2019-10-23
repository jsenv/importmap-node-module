import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"
import { importMetaURLToFolderPath } from "../../importMetaUrlToFolderPath.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const actual = await generateImportMapForProjectPackage({
  projectPath: testFolderPath,
})
const expected = {
  imports: {
    foo: "./node_modules/foo/index.js",
  },
  scopes: {
    "./node_modules/foo/": {
      "./node_modules/foo/": "./node_modules/foo/",
      "./": "./node_modules/foo/",
    },
  },
}
assert({ actual, expected })
