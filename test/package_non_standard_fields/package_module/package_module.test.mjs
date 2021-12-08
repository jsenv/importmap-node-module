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
const fooModuleJsFileUrl = resolveUrl(
  "./node_modules/foo/module.mjs",
  testDirectoryUrl,
)

const test = async () => {
  const warnings = []
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        entryPointsToCheck: ["./main.mjs"],
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

await removeFileSystemNode(fooModuleJsFileUrl, { allowUseless: true })

const preferExportFieldWarning = {
  code: "PREFER_EXPORTS_FIELD",
  message: `A package is using a non-standard "module" field. To get rid of this warning check suggestion below
--- package.json path ---
${urlToFileSystemPath(fooPackageJsonFileUrl)}
--- suggestion ---
Add the following into "packageManualOverrides"
{
  "foo": {
    "exports": {
      "import": "./module.mjs"
    }
  }
}
As explained in https://github.com/jsenv/importmap-node-module#packagesmanualoverrides
--- suggestion 2 ---
Create a pull request in https://github.com/reduxjs/react-redux to use "exports" instead of "module"`,
}

{
  const actual = await test()
  const expected = {
    warnings: [
      preferExportFieldWarning,
      {
        code: "PACKAGE_ENTRY_NOT_FOUND",
        message: `File not found for package.json "module" field
--- module ---
./module.mjs
--- package.json path ---
${urlToFileSystemPath(fooPackageJsonFileUrl)}
--- url tried ---
${urlToFileSystemPath(fooModuleJsFileUrl)}`,
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
file not found on filesystem`,
      },
    ],
    importmaps: {
      "test.importmap": {
        imports: {
          "root/": "./",
          "foo/": "./node_modules/foo/",
          "root": "./main.mjs",
          "foo": "./node_modules/foo/module.mjs",
        },
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}

await writeFile(fooModuleJsFileUrl)

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
          "foo": "./node_modules/foo/module.mjs",
        },
        scopes: {},
      },
    },
  }
  assert({ actual, expected })
}
