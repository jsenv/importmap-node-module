import { assert } from "@jsenv/assert"
import { fileUrlToPath } from "../../../src/internal/urlHelpers.js"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryPath = fileUrlToPath(import.meta.resolve("./"))

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
