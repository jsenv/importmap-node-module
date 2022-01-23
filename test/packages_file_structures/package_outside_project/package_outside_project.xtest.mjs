import { resolveUrl, urlToFileSystemPath } from "@jsenv/filesystem"
import { assert } from "@jsenv/assert"

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

const testDirectoryUrl = resolveUrl("./root/", import.meta.url)

// not found for browser runtime
// {
//   const warnings = []
//   const importmaps = await writeImportMapFiles({
//     projectDirectoryUrl: testDirectoryUrl,
//     importMapFiles: {
//       "test.importmap": {
//         mappingsForNodeResolution: true,
//       },
//     },
//     onWarn: (warning) => {
//       warnings.push(warning)
//     },
//     writeFiles: false,
//   })
//   const actual = {
//     warnings,
//     importmap: importmaps["test.importmap"],
//   }
//   const expected = {
//     warnings: [
//       {
//         code: "CANNOT_FIND_PACKAGE",
//         message: `cannot find a dependency.
// --- dependency ---
// foo@*
// --- required by ---
// ${urlToFileSystemPath(new URL("./root/package.json", import.meta.url))}`,
//       },
//     ],
//     importmap: {
//       imports: {
//         "root/": "./",
//         "root": "./index.js",
//       },
//       scopes: {},
//     },
//   }
//   assert({ actual, expected })
// }

// found when runtime is node
{
  const warnings = []
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        runtime: "node",
      },
    },
    onWarn: (warning) => {
      warnings.push(warning)
    },
    writeFiles: false,
  })
  const actual = {
    warnings,
    importmap: importmaps["test.importmap"],
  }
  const expected = {
    warnings: [],
    importmap: {
      imports: {
        "root/": "./",
        "root": "./index.js",
      },
      scopes: {},
    },
  }
  assert({ actual, expected })
}
