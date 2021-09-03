import {
  getImportMapFromProjectFiles,
  writeImportMapFile,
} from "@jsenv/importmap-node-module"

const projectDirectoryUrl = String(new URL("./", import.meta.url))

writeImportMapFile(
  [
    getImportMapFromProjectFiles({
      projectDirectoryUrl,
      runtime: "node",
    }),
  ],
  {
    projectDirectoryUrl,
    jsConfigFile: true,
  },
)
