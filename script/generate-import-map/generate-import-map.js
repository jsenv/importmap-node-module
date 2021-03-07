import {
  getImportMapFromProjectFiles,
  generateImportMapForProject,
} from "@jsenv/node-module-import-map"
import { projectDirectoryUrl, importMapFileRelativeUrl } from "../../jsenv.config.js"

generateImportMapForProject(
  [
    getImportMapFromProjectFiles({
      projectDirectoryUrl,
      target: "node",
      dev: true,
    }),
  ],
  {
    projectDirectoryUrl,
    importMapFileRelativeUrl,
    jsConfigFile: true,
  },
)
