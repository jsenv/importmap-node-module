import { resolveImport, normalizeImportMap } from "@jsenv/importmap"
import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
    },
  },
  writeFiles: false,
})

const actual = importmaps["test.importmap"]
const expected = {
  imports: {
    "root/": "./",
    "bar/": "./node_modules/bar/",
    "foo/": "./node_modules/foo/",
    "root": "./index.js",
    "bar": "./node_modules/bar/bar.js",
    "foo": "./node_modules/foo/foo.js",
  },
  scopes: {
    "./node_modules/foo/node_modules/bar/": {
      "bar/": "./node_modules/foo/node_modules/bar/",
    },
    "./node_modules/foo/": {
      "bar/": "./node_modules/foo/node_modules/bar/",
      "bar": "./node_modules/foo/node_modules/bar/bar.js",
    },
  },
}
assert({ actual, expected })

const importMapNormalized = normalizeImportMap(actual, "http://example.com")
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
