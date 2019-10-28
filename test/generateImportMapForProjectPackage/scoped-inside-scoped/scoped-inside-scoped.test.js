import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"
import { importMetaURLToDirectoryPath } from "../../importMetaURLToDirectoryPath.js"

const testDirectoryPath = importMetaURLToDirectoryPath(import.meta.url)
const actual = await generateImportMapForProjectPackage({
  projectDirectoryPath: testDirectoryPath,
  includeDevDependencies: true,
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
