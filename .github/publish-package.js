import { publishPackage } from "@jsenv/package-publish"
import { projectDirectoryUrl } from "../jsenv.config.js"

publishPackage({
  projectDirectoryUrl,
  registriesConfig: {
    "https://registry.npmjs.org": {
      token: process.env.NPM_TOKEN,
    },
    "https://npm.pkg.github.com": {
      token: process.env.GITHUB_TOKEN,
    },
  },
})
