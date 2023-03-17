import { assert } from "@jsenv/assert"
import { readFile, writeFile } from "@jsenv/filesystem"
import { resolveUrl } from "@jsenv/urls"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./", import.meta.url)
const jsConfigFileUrl = resolveUrl("jsconfig.json", testDirectoryUrl)

// arrange
await writeFile(
  jsConfigFileUrl,
  JSON.stringify(
    {
      compilerOptions: {
        jsx: "react",
        paths: {
          "src/*": ["./src/*"],
        },
      },
    },
    null,
    "  ",
  ),
)

// act
await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  logLevel: "warn",
  importMapFiles: {
    "test.importmap": {
      manualImportMap: {
        imports: { foo: "./bar.js" },
      },
      useForJsConfigJSON: true,
    },
  },
  writeFiles: false,
})

// assert
const actual = await readFile(jsConfigFileUrl, { as: "json" })
const expected = {
  compilerOptions: {
    baseUrl: ".",
    // paths are overwritten
    paths: {
      foo: ["./bar.js"],
    },
    // react is kept
    jsx: "react",
  },
}
assert({ actual, expected })
