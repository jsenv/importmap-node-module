// import { normalizeImportMap, resolveImport } from "@jsenv/importmap"
import { resolveUrl } from "@jsenv/filesystem"
import { assert } from "@jsenv/assert"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./index.js"],
      removeUnusedMappings: true,
    },
  },
  writeFiles: false,
})

{
  const actual = importmaps["test.importmap"]
  const expected = {
    imports: {
      foo: "./node_modules/foo/foo.js",
    },
    scopes: {
      "./node_modules/bar/": {
        "./node_modules/bar/": "./node_modules/bar/",
        "bar/": "./node_modules/bar/",
      },
      "./node_modules/foo/": {
        bar: "./node_modules/bar/bar.js",
      },
    },
  }
  assert({ actual, expected })
}

// does not work with file:// protocol because / leads to filesystemroot
// {
//   const importMapNormalized = normalizeImportMap(importMap, "http://example.com")
//   const actual = resolveImport({
//     specifier: "http://example.com/file-inside-bar.js",
//     importer: `http://example.com/node_modules/bar/bar.js`,
//     importMap: importMapNormalized,
//   })
//   const expected = `http://example.com/node_modules/bar/file-inside-bar.js`
//   assert({ actual, expected })
// }
