import { generateImportMapForProject } from "@jsenv/node-module-import-map"
import * as jsenvConfig from "../../jsenv.config.js"

generateImportMapForProject({
  ...jsenvConfig,
  importMapFile: true,
  jsConfigFile: true,
})
