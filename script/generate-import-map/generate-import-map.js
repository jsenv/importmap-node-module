import {
  getImportMapFromProjectFiles,
  generateImportMapForProject,
} from "@jsenv/node-module-import-map"
import { projectDirectoryUrl, importMapFileRelativeUrl } from "../../jsenv.config.js"

generateImportMapForProject(
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
