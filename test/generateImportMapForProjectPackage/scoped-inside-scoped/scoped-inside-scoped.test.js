import { assert } from "@jsenv/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testDirectoryUrl = import.meta.resolve("./")

const actual = await generateImportMapForProjectPackage({
  projectDirectoryUrl: testDirectoryUrl,
  includeDevDependencies: true,
})
const expected = {
  imports: {
    "@jsenv/bundling/": "./node_modules/@jsenv/bundling/",
    "@jsenv/bundling": "./node_modules/@jsenv/bundling/whatever.js",
    "root/": "./",
  },
  scopes: {
    "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/node_modules/@dmail/project-structure/": {
      "@dmail/project-structure/":
        "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/node_modules/@dmail/project-structure/",
    },
    "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/": {
      "@dmail/project-structure":
        "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/node_modules/@dmail/project-structure/whatever.js",
      "@jsenv/core/": "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/",
    },
    "./node_modules/@jsenv/bundling/": {
      "@jsenv/core": "./node_modules/@jsenv/bundling/node_modules/@jsenv/core/whatever.js",
    },
  },
}
assert({ actual, expected })
