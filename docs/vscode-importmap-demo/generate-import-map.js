import { getImportMapFromProjectFiles, writeImportMapFile } from "@jsenv/node-module-import-map"

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
