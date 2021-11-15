import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"
import { normalizeImportMap, resolveImport } from "@jsenv/importmap"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      extensionlessAutomapping: true,
      magicExtensions: [".js"],
    },
  },
  writeFiles: false,
})

const importmap = importmaps["test.importmap"]
const actual = importmap
const expected = {
  imports: {
    "react-redux": "./node_modules/react-redux/es/index.js",
    "whatever/": "./",
    "whatever": "./index.js",
  },
  scopes: {
    "./node_modules/react-redux/": {
      "./answer": "./node_modules/react-redux/es/answer.js",
    },
  },
}
assert({ actual, expected })

// THIS SHOULD FAIL
{
  const importMapNormalized = normalizeImportMap(
    importmap,
    "http://example.com",
  )
  const actual = resolveImport({
    specifier: "./answer",
    importer: "http://example.com/node_modules/react-redux/es/index.js",
    importMap: importMapNormalized,
  })
  const expected = "http://example.com/node_modules/react-redux/es/answer.js"
  assert({ actual, expected })
}
