/*
 * When this file is executed it does 2 things:
 *
 * - write "./node_resolution.importmap" file that is used by ESLint to resolve imports
 * - update "paths" in "./jsconfig.json" file that is used by VSCode to resolve imports
 */

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("../", import.meta.url),
  importMapFiles: {
    "./node_resolution.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
      useForJsConfigJSON: true,
    },
  },
  // exportsFieldWarningConfig: { dependencies: true },
})
