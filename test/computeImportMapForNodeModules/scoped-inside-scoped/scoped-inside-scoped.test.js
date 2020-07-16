import { assert } from "@jsenv/assert"
import { resolveUrl } from "@jsenv/util"
import { computeImportMapForNodeModules } from "../../../index.js"

const testDirectoryUrl = resolveUrl("./", import.meta.url)

const actual = await computeImportMapForNodeModules({
  projectDirectoryUrl: testDirectoryUrl,
  projectPackageDevDependenciesIncluded: true,
  packagesSelfImport: false,
})
const expected = {
  imports: {
    "@jsenv/bundling": "./node_modules/@jsenv/bundling/whatever.js",
  },
  scopes: {
    "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/": {
      "@dmail/project-structure":
        "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/node_modules/@dmail/project-structure/whatever.js",
    },
    "./node_modules/@jsenv/bundling/": {
      "@jsenv/core": "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/whatever.js",
    },
  },
}
assert({ actual, expected })
