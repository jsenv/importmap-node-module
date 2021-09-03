import { assert } from "@jsenv/assert"
import { resolveUrl, readFile } from "@jsenv/filesystem"
import { writeImportMapFile } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./", import.meta.url)
const importMapFileRelativeUrl = "test.importmap"
const importMapFileUrl = resolveUrl(importMapFileRelativeUrl, testDirectoryUrl)

await writeImportMapFile(
  [
    {
      imports: { foo: "./bar.js", bar: "./hello.js" },
    },
    {
      imports: { foo: "./whatever.js" },
    },
  ],
  {
    projectDirectoryUrl: testDirectoryUrl,
    importMapFileRelativeUrl,
    // importMapFileLog: false,
  },
)
const actual = await readFile(importMapFileUrl, { as: "json" })
const expected = {
  imports: {
    bar: "./hello.js",
    foo: "./whatever.js",
  },
}
assert({ actual, expected })
