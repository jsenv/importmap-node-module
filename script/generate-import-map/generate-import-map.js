import {
  getImportMapFromNodeModules,
  generateImportMapForProject,
} from "@jsenv/node-module-import-map"
import { projectDirectoryUrl, importMapFileRelativeUrl } from "../../jsenv.config.js"

generateImportMapForProject(
  [
    getImportMapFromNodeModules({
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
