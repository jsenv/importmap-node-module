import { installGitHooks } from "@jsenv/git-hooks"
import * as jsenvConfig from "../../jsenv.config.js"

installGitHooks({
  ...jsenvConfig,
})
