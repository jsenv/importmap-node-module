import { assert } from "@jsenv/assert"
import { resolveUrl, readFile, writeFile, removeFileSystemNode } from "@jsenv/util"
import { writeImportMapFile } from "@jsenv/importmap-node-module"

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
await writeImportMapFile(
  [
    {
      imports: { foo: "./bar.js" },
    },
  ],
  {
    projectDirectoryUrl: testDirectoryUrl,
    importMapFile: false,
    jsConfigFile: true,
    jsConfigFileLog: false,
  },
)
// assert
try {
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
} finally {
  await removeFileSystemNode(jsConfigFileUrl)
}
