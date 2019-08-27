import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { remapResolvedImport } from "@jsenv/module-resolution"
import { assert } from "@dmail/assert"
import { generateImportMapForNodeModules } from "../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const importMap = await generateImportMapForNodeModules({
  projectPath: testFolderPath,
})

{
  const actual = importMap
  const expected = {
    imports: {
      "bar/": "/node_modules/bar/",
      "foo/": "/node_modules/foo/",
      bar: "/node_modules/bar/bar.js",
      foo: "/node_modules/foo/foo.js",
    },
    scopes: {
      "/node_modules/foo/": {
        "bar/": "/node_modules/foo/node_modules/bar/",
        bar: "/node_modules/foo/node_modules/bar/bar.js",
      },
    },
  }
  assert({ actual, expected })
}

const resolve = ({ importer, specifier }) =>
  remapResolvedImport({
    importMap,
    importerHref: `http://example.com/${importer}`,
    resolvedImport: `http://example.com/${specifier}`,
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
