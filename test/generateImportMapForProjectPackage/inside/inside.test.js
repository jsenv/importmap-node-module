import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { applyImportMap, normalizeImportMap } from "@jsenv/import-map"
import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const importMap = await generateImportMapForProjectPackage({
  projectPath: testFolderPath,
})

const actual = importMap
const expected = {
  imports: {
    bar: "/node_modules/bar/bar.js",
    foo: "/node_modules/foo/foo.js",
  },
  scopes: {
    "/node_modules/foo/": {
      bar: "/node_modules/foo/node_modules/bar/bar.js",
    },
  },
}
assert({ actual, expected })

const importMapNormalized = normalizeImportMap(importMap, "http://example.com")
// import 'bar' inside project
{
  const actual = applyImportMap({
    importMap: importMapNormalized,
    href: `http://example.com/bar`,
    importerHref: `http://example.com/scoped.js`,
  })
  const expected = `http://example.com/node_modules/bar/bar.js`
  assert({ actual, expected })
}

// import 'bar' inside foo
{
  const actual = applyImportMap({
    importMap: importMapNormalized,
    href: `http://example.com/bar`,
    importerHref: `http://example.com/node_modules/foo/foo.js`,
  })
  const expected = `http://example.com/node_modules/foo/node_modules/bar/bar.js`
  assert({ actual, expected })
}
