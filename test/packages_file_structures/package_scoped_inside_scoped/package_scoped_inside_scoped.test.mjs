import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
      removeUnusedMappings: false,
      ignoreJsFiles: true,
    },
  },
  writeFiles: false,
})

const actual = importmaps["test.importmap"]
const expected = {
  imports: {
    "@dmail/project-structure/":
      "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/node_modules/@dmail/project-structure/",
    "@dmail/project-structure":
      "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/node_modules/@dmail/project-structure/whatever.js",
    "@jsenv/bundling/": "./node_modules/@jsenv/bundling/",
    "@jsenv/bundling": "./node_modules/@jsenv/bundling/whatever.js",
    "@jsenv/core/": "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/",
    "@jsenv/core":
      "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/whatever.js",
    "root/": "./",
    "root": "./index.js",
  },
  scopes: {},
}
assert({ actual, expected })
