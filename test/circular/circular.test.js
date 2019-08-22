import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForProjectNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const actual = await generateImportMapForProjectNodeModules({
  projectPath: testFolderPath,
  writeImportMapFile: false,
  writeJsconfigFile: false,
  remapFolder: false,
  scopeOriginRelativePerModule: false,
})
const expected = {
  imports: {
    bar: "/node_modules/bar/bar.js",
    foo: "/node_modules/foo/foo.js",
  },
  scopes: {
    "/node_modules/bar/": { foo: "/node_modules/foo/foo.js" },
    "/node_modules/foo/": { bar: "/node_modules/bar/bar.js" },
  },
}
assert({
  actual,
  expected,
})
