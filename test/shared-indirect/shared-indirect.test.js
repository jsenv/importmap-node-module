import { assert } from "@dmail/assert"
import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { generateImportMapForProjectNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const actual = await generateImportMapForProjectNodeModules({
  projectPath: testFolderPath,
  writeImportMapFile: false,
  remapFolder: false,
})
debugger
// here we misses that when inside actual bar
// location and not /node_modules/foo/node_modules/bar
// we are elsewhere
const expected = {
  imports: {
    foo: "/node_modules/foo/foo.js",
  },
  scopes: {
    "/node_modules/foo": {
      bar: "/node_modules/bar/bar.js",
    },
  },
}
assert({ actual, expected })
