import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

const test = async ({ runtime, packageUserConditions } = {}) => {
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        runtime,
        packageUserConditions,
      },
    },
    writeFiles: false,
  })
  return importmaps["test.importmap"]
}

{
  const actual = await test({
    runtime: "browser",
    packageUserConditions: ["development"],
  })
  const expected = {
    imports: {
      "whatever/": "./",
      "whatever": "./index",
      "foo": "./node_modules/foo/main.browser.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}

{
  const actual = await test({
    runtime: "node",
    packageUserConditions: ["development"],
  })
  const expected = {
    imports: {
      "whatever/": "./",
      "whatever": "./index",
      "foo": "./node_modules/foo/main.js",
    },
    scopes: {},
  }
  assert({ actual, expected })
}
