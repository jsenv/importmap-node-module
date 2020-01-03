import { resolveImport, normalizeImportMap } from "@jsenv/import-map"
import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const importMap = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
})
const actual = importMap
const expected = {
  imports: {
    "root/": "./",
    "bar/": "./node_modules/bar/",
    "foo/": "./node_modules/foo/",
    "bar": "./node_modules/bar/bar.js",
    "foo": "./node_modules/foo/foo.js",
  },
  scopes: {
    "./node_modules/foo/node_modules/bar/": {
      "bar/": "./node_modules/foo/node_modules/bar/",
    },
    "./node_modules/foo/": {
      bar: "./node_modules/foo/node_modules/bar/bar.js",
    },
  },
}
assert({ actual, expected })

const importMapNormalized = normalizeImportMap(importMap, "http://example.com")
// import 'bar' inside project
{
  const actual = resolveImport({
    specifier: `bar`,
    importer: `http://example.com/scoped.js`,
    importMap: importMapNormalized,
  })
  const expected = `http://example.com/node_modules/bar/bar.js`
  assert({ actual, expected })
}

// import 'bar' inside foo
{
  const actual = resolveImport({
    specifier: `bar`,
    importer: `http://example.com/node_modules/foo/foo.js`,
    importMap: importMapNormalized,
  })
  const expected = `http://example.com/node_modules/foo/node_modules/bar/bar.js`
  assert({ actual, expected })
}

// import 'bar/file.js' inside 'bar'
{
  const actual = resolveImport({
    specifier: `bar/file.js`,
    importer: `http://example.com/node_modules/foo/node_modules/bar/bar.js`,
    importMap: importMapNormalized,
  })
  const expected = `http://example.com/node_modules/foo/node_modules/bar/file.js`
  assert({ actual, expected })
}
