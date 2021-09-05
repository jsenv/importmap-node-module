import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const test = async ({ runtime }) => {
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        runtime,
      },
    },
    writeFiles: false,
  })
  return importmaps["test.importmap"]
}

{
  const actual = await test({
    runtime: "browser",
  })
  const expected = {
    imports: {
      "foo/file.js": "./node_modules/foo/file.browser.js",
      "root/": "./",
      "root": "./index",
    },
    scopes: {},
  }
  assert({ actual, expected })
}

{
  const actual = await test({
    runtime: "other",
  })
  const expected = {
    imports: {
      "foo/file.js": "./node_modules/foo/file.default.js",
      "root/": "./",
      "root": "./index",
    },
    scopes: {},
  }
  assert({ actual, expected })
}
