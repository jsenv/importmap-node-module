import { assert } from "@jsenv/assert"
import { resolveUrl, removeFileSystemNode, writeFile } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const mainJsFileUrl = resolveUrl("./main.js", testDirectoryUrl)
const mainCjsFileUrl = resolveUrl("./main.cjs", testDirectoryUrl)
const test = async ({ packageUserConditions }) => {
  const warnings = []
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        checkImportResolution: true,
        packageUserConditions,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning)
    },
    writeFiles: false,
  })
  return { warnings, importmaps }
}

await removeFileSystemNode(mainJsFileUrl, { allowUseless: true })
await removeFileSystemNode(mainCjsFileUrl, { allowUseless: true })

{
  const actual = await test({
    packageUserConditions: [],
  })
  const expected = {
    warnings: [
      {
        code: "PROJECT_ENTRY_POINT_RESOLUTION_FAILED",
        message: `Cannot find project entry point
--- reason ---
file not found for "./main.js" declared in package.json "exports"`,
      },
    ],
    importmaps: {
      "test.importmap": {
        imports: {},
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}

{
  const actual = await test({
    packageUserConditions: ["require"],
  })
  const expected = {
    warnings: [
      {
        code: "PROJECT_ENTRY_POINT_RESOLUTION_FAILED",
        message: `Cannot find project entry point
--- reason ---
file not found for "./main.cjs" declared in package.json "exports"`,
      },
    ],
    importmaps: {
      "test.importmap": {
        imports: {},
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}

await writeFile(mainJsFileUrl)
await writeFile(mainCjsFileUrl)

{
  const actual = await test({
    packageUserConditions: [],
  })
  const expected = {
    warnings: [],
    importmaps: {
      "test.importmap": {
        imports: {},
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}

{
  const actual = await test({
    packageUserConditions: ["require"],
  })
  const expected = {
    warnings: [],
    importmaps: {
      "test.importmap": {
        imports: {},
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}
