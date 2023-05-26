/*
 * This file is executed by main.yml GitHub workflow during "ensure github release" step
 * When this file is executed it checks if there is a release on GitHub for the current
 * package.json version. If not it's created.
 * This is to help creating GitHub releases.
 */

import { ensureGithubReleaseForPackage } from "@jsenv/github-release-package"

await ensureGithubReleaseForPackage({
  rootDirectoryUrl: new URL("../../", import.meta.url),
})
