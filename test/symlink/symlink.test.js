import { pathnameToDirname, hrefToPathname } from "@jsenv/module-resolution"
import { assert } from "@dmail/assert"
import { generateImportMapForProjectNodeModules } from "../../index.js"

const testFolder = pathnameToDirname(hrefToPathname(import.meta.url))
const actual = await generateImportMapForProjectNodeModules({
  projectPath: testFolder,
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
