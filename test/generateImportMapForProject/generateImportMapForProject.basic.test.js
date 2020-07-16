import { assert } from "@jsenv/assert"
import { resolveUrl, readFile } from "@jsenv/util"
import { generateImportMapForProject } from "../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)
const importMapFileRelativeUrl = "test.importmap"
const importMapFileUrl = resolveUrl(importMapFileRelativeUrl, testDirectoryUrl)

await generateImportMapForProject(
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
const actual = JSON.parse(await readFile(importMapFileUrl))
const expected = {
  imports: {
    foo: "./whatever.js",
    bar: "./hello.js",
  },
  scopes: {},
}
assert({ actual, expected })
