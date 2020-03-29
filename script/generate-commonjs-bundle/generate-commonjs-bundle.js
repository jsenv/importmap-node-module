import { generateCommonJsBundleForNode } from "@jsenv/core"
import * as jsenvConfig from "../../jsenv.config.js"

generateCommonJsBundleForNode({
  ...jsenvConfig,
  bundleDirectoryClean: true,
})
