import { normalizeImportMap, resolveImport } from "@jsenv/import-map"
import { resolveUrl } from "@jsenv/util"
import { assert } from "@jsenv/assert"
import { getImportMapFromProjectFiles } from "@jsenv/node-module-import-map"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const importMap = await getImportMapFromProjectFiles({
  projectDirectoryUrl: testDirectoryUrl,
})
{
  const actual = importMap
  const expected = {
    imports: {
      "bar/": "./node_modules/bar/",
      "bar": "./node_modules/bar/bar.js",
      "foo": "./node_modules/foo/foo.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}

{
  const importMapNormalized = normalizeImportMap(importMap, "http://example.com")

  // import 'bar' inside project
  {
    const actual = resolveImport({
      specifier: "bar",
      importer: "http://example.com/shared.js",
      importMap: importMapNormalized,
    })
    const expected = "http://example.com/node_modules/bar/bar.js"
    assert({ actual, expected })
  }

  // import 'bar' inside foo
  {
    const actual = resolveImport({
      specifier: "bar",
      importer: "http://example.com/node_modules/foo/foo.js",
      importMap: importMapNormalized,
    })
    const expected = "http://example.com/node_modules/bar/bar.js"
    assert({ actual, expected })
  }

  // import '/node_modules/bar/bar.js' inside foo
  {
    const actual = resolveImport({
      specifier: "http://example.com/node_modules/foo/node_modules/bar/bar.js",
      importer: "http://example.com/node_modules/foo/foo.js",
      importMap: importMapNormalized,
    })
    const expected = "http://example.com/node_modules/foo/node_modules/bar/bar.js"
    assert({ actual, expected })
  }

  // import 'foo' inside project
  {
    const actual = resolveImport({
      specifier: "foo",
      importer: "http://example.com/shared.js",
      importMap: importMapNormalized,
    })
    const expected = "http://example.com/node_modules/foo/foo.js"
    assert({ actual, expected })
  }

  // import '/node_modules/foo/foo.js' inside bar
  {
    const actual = resolveImport({
      specifier: "http://example.com/node_modules/bar/node_modules/foo/foo.js",
      importer: "http://example.com/node_modules/bar/bar.js",
      importMap: importMapNormalized,
    })
    // there is no remapping because package.json does not specify
    // a dependency
    const expected = "http://example.com/node_modules/bar/node_modules/foo/foo.js"
    assert({ actual, expected })
  }
}
