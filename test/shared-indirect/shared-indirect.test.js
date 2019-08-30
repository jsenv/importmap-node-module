import { assert } from "@dmail/assert"
import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { applyImportMap } from "@jsenv/import-map"
import { generateImportMapForNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const importMap = await generateImportMapForNodeModules({
  projectPath: testFolderPath,
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
      bar: "/node_modules/bar/bar.js",
    },
  },
}
assert({ actual, expected })

{
  const actual = applyImportMap({
    importMap,
    href: "http://example.com/file-inside-bar.js",
    importerHref: `http://example.com/node_modules/bar/bar.js`,
  })
  const expected = `http://example.com/node_modules/bar/file-inside-bar.js`
  assert({ actual, expected })
}
