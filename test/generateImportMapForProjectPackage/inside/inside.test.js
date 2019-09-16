import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { applyImportMap } from "@jsenv/import-map"
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

const resolve = ({ importer, specifier }) =>
  applyImportMap({
    importMap,
    href: `http://example.com/${specifier}`,
    importerHref: `http://example.com/${importer}`,
  }).slice("http://example.com/".length)

// import 'bar' inside project
{
  const actual = resolve({ importer: "scoped.js", specifier: "bar" })
  const expected = "node_modules/bar/bar.js"
  assert({ actual, expected })
}

// import 'bar' inside foo
{
  const actual = resolve({ importer: "node_modules/foo/foo.js", specifier: "bar" })
  const expected = "node_modules/foo/node_modules/bar/bar.js"
  assert({ actual, expected })
}
