import { formatWithPrettier } from "@jsenv/prettier-check-project"
import * as jsenvConfig from "../../jsenv.config.js"

formatWithPrettier({
  ...jsenvConfig,
})
