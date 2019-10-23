import { resolveImport, normalizeImportMap } from "@jsenv/import-map"
import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"
import { importMetaURLToFolderPath } from "../../importMetaUrlToFolderPath.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const importMap = await generateImportMapForProjectPackage({
  projectPath: testFolderPath,
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
