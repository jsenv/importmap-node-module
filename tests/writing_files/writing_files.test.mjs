import { assert } from "@jsenv/assert"
import { readFile } from "@jsenv/filesystem"
import { resolveUrl } from "@jsenv/urls"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  logLevel: "warn",
  importMapFiles: {
    "dev.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
    },
    "prod.importmap": {
      mappingsForNodeResolution: true,
    },
  },
})
const devImportMapFile = await readFile(
  resolveUrl("dev.importmap", testDirectoryUrl),
  { as: "json" },
)
const prodImportMapFile = await readFile(
  resolveUrl("prod.importmap", testDirectoryUrl),
  { as: "json" },
)

const actual = {
  devImportMapFile,
  prodImportMapFile,
}
const expected = {
  devImportMapFile: {
    imports: {
      "root/": "./",
      "bar/": "./node_modules/bar/",
      "foo/": "./node_modules/foo/",
      "root": "./index",
      "bar": "./node_modules/bar/bar.js",
      "foo": "./node_modules/foo/foo.js",
    },
    scopes: {},
  },
  prodImportMapFile: {
    imports: {
      "root/": "./",
      "foo/": "./node_modules/foo/",
      "root": "./index",
      "foo": "./node_modules/foo/foo.js",
    },
    scopes: {},
  },
}
assert({ actual, expected })
