import { uploadCoverage } from "@jsenv/codecov-upload"
import * as jsenvConfig from "../../jsenv.config.js"

uploadCoverage({
  ...jsenvConfig,
})
