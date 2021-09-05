import { normalizeImportMap, resolveImport } from "@jsenv/importmap"
import { resolveUrl } from "@jsenv/filesystem"
import { assert } from "@jsenv/assert"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      removeUnusedMappings: true,
    },
  },
  writeFiles: false,
})
const importmap = importmaps["test.importmap"]

{
  const actual = importmap
  const expected = {
    imports: {
      "lume-fake": "./node_modules/lume-fake/lume.js",
      "root": "./index.js",
    },
    scopes: {
      "./node_modules/lume-fake/": {
        "lowclass-fake":
          "./node_modules/lume-fake/node_modules/lowclass-fake/dist/index.js",
      },
    },
  }
  assert({ actual, expected })
}

{
  const importMapNormalized = normalizeImportMap(
    importmap,
    "http://example.com",
  )
  const actual = resolveImport({
    specifier: "lowclass-fake",
    importer: `http://example.com/node_modules/lume-fake/index.js`,
    importMap: importMapNormalized,
  })
  const expected = `http://example.com/node_modules/lume-fake/node_modules/lowclass-fake/dist/index.js`
  assert({ actual, expected })
}
