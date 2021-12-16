import { assert } from "@jsenv/assert"
import {
  resolveUrl,
  urlToFileSystemPath,
  removeFileSystemNode,
  writeFile,
} from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const rootMainJsFileUrl = resolveUrl("./main.mjs", testDirectoryUrl)
const fooPackageJsonFileUrl = resolveUrl(
  "./node_modules/foo/package.json",
  testDirectoryUrl,
)
const fooBrowserJsFileUrl = resolveUrl(
  "./node_modules/foo/browser.js",
  testDirectoryUrl,
)

const test = async ({ runtime } = {}) => {
  const warnings = []
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        entryPointsToCheck: ["./main.mjs"],
        runtime,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning)
    },
    writeFiles: false,
    exportsFieldWarningConfig: { dependencies: true },
  })
  return { warnings, importmaps }
}

await removeFileSystemNode(fooBrowserJsFileUrl, { allowUseless: true })

const preferExportFieldWarning = {
  code: "PREFER_EXPORTS_FIELD",
  message: `A package is using a non-standard "browser" field. To get rid of this warning check suggestion below
--- package.json path ---
${urlToFileSystemPath(fooPackageJsonFileUrl)}
--- suggestion ---
Add the following into "packageManualOverrides"
{
  "foo": {
    "exports": {
      "browser": "./browser.js"
    }
  }
}
As explained in https://github.com/jsenv/importmap-node-module#packagesmanualoverrides
--- suggestion 2 ---
Create a pull request in https://github.com/foo/bar to use "exports" instead of "browser"`,
}

{
  const importedFileUrl = `${testDirectoryUrl}node_modules/foo/browser.js`
  const actual = await test()
  const expected = {
    warnings: [
      preferExportFieldWarning,
      {
        code: "PACKAGE_ENTRY_NOT_FOUND",
        message: `File not found for package.json "browser" field
--- browser ---
./browser.js
--- package.json path ---
${urlToFileSystemPath(fooPackageJsonFileUrl)}
--- url tried ---
${urlToFileSystemPath(fooBrowserJsFileUrl)}`,
      },
      {
        code: "IMPORT_RESOLUTION_FAILED",
        message: `Import resolution failed for "foo"
--- import source ---
${rootMainJsFileUrl}:2:7
  1 | // eslint-disable-next-line import/no-unresolved
> 2 | import "foo"
    |       ^
  3 |${" "}
--- reason ---
file not found on filesystem at ${urlToFileSystemPath(importedFileUrl)}`,
      },
    ],
    importmaps: {
      "test.importmap": {
        imports: {
          "root/": "./",
          "foo/": "./node_modules/foo/",
          "root": "./main.mjs",
          "foo": "./node_modules/foo/browser.js",
        },
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}

await writeFile(fooBrowserJsFileUrl)

{
  const actual = await test()
  const expected = {
    warnings: [preferExportFieldWarning],
    importmaps: {
      "test.importmap": {
        imports: {
          "root/": "./",
          "foo/": "./node_modules/foo/",
          "root": "./main.mjs",
          "foo": "./node_modules/foo/browser.js",
        },
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}

{
  const actual = await test({
    runtime: "node",
  })
  const expected = {
    warnings: [],
    importmaps: {
      "test.importmap": {
        imports: {
          "root/": "./",
          "foo/": "./node_modules/foo/",
          "root": "./main.mjs",
          "foo": "./node_modules/foo/foo.js",
        },
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}
