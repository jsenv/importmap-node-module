import { assert } from "@dmail/assert"
import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { resolvePath } from "@jsenv/module-resolution"
import { generateImportMapForProjectNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const importMap = await generateImportMapForProjectNodeModules({
  projectPath: testFolderPath,
  writeImportMapFile: false,
  remapFolder: false,
  scopeOriginRelativePerModule: true,
})
const actual = importMap
const expected = {
  imports: {
    foo: "/node_modules/foo/foo.js",
  },
  scopes: {
    "/node_modules/bar/": {
      "/node_modules/bar/": "/node_modules/bar/",
      "/": "/node_modules/bar/",
    },
    "/node_modules/foo/": {
      "/node_modules/foo/node_modules/bar/": "/node_modules/bar/",
      "/node_modules/bar/": "/node_modules/bar/",
      "/node_modules/foo/": "/node_modules/foo/",
      bar: "/node_modules/bar/bar.js",
      "/": "/node_modules/foo/",
    },
  },
}
assert({ actual, expected })

{
  const actual = resolvePath({
    specifier: "/file-inside-bar.js",
    importer: `http://example.com/node_modules/bar/bar.js`,
    importMap,
  })
  const expected = `http://example.com/node_modules/bar/file-inside-bar.js`
  assert({ actual, expected })
}
