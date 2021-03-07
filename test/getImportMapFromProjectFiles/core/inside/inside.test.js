import { resolveImport, normalizeImportMap } from "@jsenv/import-map"
import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const importMap = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
  packagesSelfReference: false,
})
const actual = importMap
const expected = {
  imports: {
    bar: "./node_modules/bar/bar.js",
    foo: "./node_modules/foo/foo.js",
  },
  scopes: {
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
try {
  resolveImport({
    specifier: `bar/file.js`,
    importer: `http://example.com/node_modules/foo/node_modules/bar/bar.js`,
    importMap: importMapNormalized,
  })
  throw new Error("should throw")
} catch (actual) {
  const expected = new Error(`Unmapped bare specifier.
--- specifier ---
bar/file.js
--- importer ---
http://example.com/node_modules/foo/node_modules/bar/bar.js`)
  assert({ actual, expected })
}
