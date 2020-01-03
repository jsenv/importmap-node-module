import { normalizeImportMap, resolveImport } from "@jsenv/import-map"
import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const importMap = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
  includeImports: true,
})
{
  const actual = importMap
  const expected = {
    imports: {
      "root/": "./",
      "foo/": "./node_modules/foo/",
      "foo": "./node_modules/foo/foo.js",
    },
    scopes: {
      "./node_modules/bar/": {
        "./node_modules/bar/": "./node_modules/bar/",
        "bar/": "./node_modules/bar/",
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
