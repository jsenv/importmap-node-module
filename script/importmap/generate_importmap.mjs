/*
 * When this file is executed it does 2 things:
 *
 * - write "./node_resolution.importmap" file that is used by ESLint to resolve imports
 * - update "paths" in "./jsconfig.json" file that is used by VSCode to resolve imports
 */

import {
  getImportMapFromProjectFiles,
  writeImportMapFile,
} from "@jsenv/importmap-node-module"

import { projectDirectoryUrl } from "../../jsenv.config.mjs"

await writeImportMapFile(
  [
    getImportMapFromProjectFiles({
      projectDirectoryUrl,
      runtime: "node",
      dev: true,
    }),
  ],
  {
    projectDirectoryUrl,
    importMapFileRelativeUrl: "./node_resolution.importmap",
    jsConfigFile: true,
  },
)
