import { assert } from "@jsenv/assert"
import { resolveUrl, urlToFileSystemPath } from "@jsenv/filesystem"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)
const fooPackageFileUrl = resolveUrl(
  "./root/node_modules/foo/package.json",
  import.meta.url,
)
const warnings = []
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
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
      code: "EXPORTS_SUBPATH_MIXED_KEYS",
      message: `unexpected keys in package.json exports: cannot mix relative and conditional keys
--- exports ---
{
  "require": "./index.js",
  "./file.js": "./src/file.js"
}
--- unexpected keys ---
"require"
--- package.json path ---
${urlToFileSystemPath(fooPackageFileUrl)}`,
    },
  ],
  importmaps: {
    "test.importmap": {
      imports: {
        "root/": "./",
        "root": "./index.js",
      },
      scopes: {},
    },
  },
}
assert({ actual, expected })
