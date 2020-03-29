import { generateImportMapForProjectPackage } from "@jsenv/node-module-import-map"
import * as jsenvConfig from "../../jsenv.config.js"

generateImportMapForProjectPackage({
  ...jsenvConfig,
  importMapFile: true,
  jsConfigFile: true,
})
