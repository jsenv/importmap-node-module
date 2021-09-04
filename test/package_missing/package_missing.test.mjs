import { assert } from "@jsenv/assert"
import { resolveUrl, urlToFileSystemPath } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const rootPackageFileUrl = resolveUrl("./package.json", testDirectoryUrl)

const warnings = []
const importmaps = await writeImportMapFiles({
  logLevel: "error",
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      mappingsTreeshaking: true,
      ignoreJsFiles: true,
    },
  },
  onWarn: (warning) => {
    warnings.push(warning)
  },
  writeFiles: false,
})
const actual = {
  warnings,
  importmaps,
}
const expected = {
  warnings: [
    {
      code: "CANNOT_FIND_PACKAGE",
      message: `cannot find a dependency.
--- dependency ---
not-found@*
--- required by ---
${urlToFileSystemPath(rootPackageFileUrl)}`,
    },
  ],
  importmaps: {
    "test.importmap": {
      imports: {
        "root/": "./",
        "root": "./index",
      },
      scopes: {},
    },
  },
}
assert({ actual, expected })
