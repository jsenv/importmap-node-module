import { ensureGithubReleaseForPackage } from "@jsenv/github-release-package"
import { projectDirectoryUrl } from "../jsenv.config.js"

ensureGithubReleaseForPackage({
  projectDirectoryUrl,
})
