import { getImportMapFromProjectFiles, writeImportMapFile } from "@jsenv/importmap-node-module"
import { projectDirectoryUrl, importMapFileRelativeUrl } from "../../jsenv.config.js"

writeImportMapFile(
  [
    getImportMapFromProjectFiles({
      projectDirectoryUrl,
      runtime: "node",
      dev: true,
    }),
  ],
  {
    projectDirectoryUrl,
    importMapFileRelativeUrl,
    jsConfigFile: true,
  },
)
