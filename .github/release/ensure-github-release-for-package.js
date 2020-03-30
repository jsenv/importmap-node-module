import { ensureGithubReleaseForPackage } from "@jsenv/github-release-package"

ensureGithubReleaseForPackage({
  projectDirectoryUrl: new URL("../../", import.meta.url),
})
