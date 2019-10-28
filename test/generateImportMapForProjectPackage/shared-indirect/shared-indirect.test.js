import { assert } from "@dmail/assert"
import { resolveImport, normalizeImportMap } from "@jsenv/import-map"
import { generateImportMapForProjectPackage } from "../../../index.js"
import { importMetaUrlToDirectoryPath } from "../../importMetaUrlToDirectoryPath.js"

const testDirectoryPath = importMetaUrlToDirectoryPath(import.meta.url)
const importMap = await generateImportMapForProjectPackage({
  projectDirectoryPath: testDirectoryPath,
})
{
  const actual = importMap
  const expected = {
    imports: {
      foo: "./node_modules/foo/foo.js",
    },
    scopes: {
      "./node_modules/bar/": {
        "./node_modules/bar/": "./node_modules/bar/",
        "./": "./node_modules/bar/",
      },
      "./node_modules/foo/": {
        bar: "./node_modules/bar/bar.js",
      },
    },
  }
  assert({ actual, expected })
}

{
  const importMapNormalized = normalizeImportMap(importMap, "http://example.com")
  const actual = resolveImport({
    specifier: "http://example.com/file-inside-bar.js",
    importer: `http://example.com/node_modules/bar/bar.js`,
    importMap: importMapNormalized,
  })
  const expected = `http://example.com/node_modules/bar/file-inside-bar.js`
  assert({ actual, expected })
}
