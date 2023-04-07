/*
 * This file is executed by main.yml GitHub workflow during "publish package" step
 * When this file is executed it checks if there is a version on npm for the current
 * package.json version. If not it's published.
 * See https://github.com/jsenv/jsenv-package-publish
 */

import { publishPackage } from "@jsenv/package-publish"

await publishPackage({
  rootDirectoryUrl: new URL("../../", import.meta.url),
  registriesConfig: {
    "https://registry.npmjs.org": {
      token: process.env.NPM_TOKEN,
    },
  },
})
