import { importMetaURLToFolderPath } from "@jsenv/operating-system-path"
import { assert } from "@dmail/assert"
import { generateImportMapForProjectPackage } from "../../../index.js"

const testFolderPath = importMetaURLToFolderPath(import.meta.url)
const actual = await generateImportMapForProjectPackage({
  projectPath: testFolderPath,
  includeDevDependencies: true,
})
const expected = {
  imports: {
    "@jsenv/bundling": "/node_modules/@jsenv/bundling/whatever.js",
  },
  scopes: {
    "/node_modules/@jsenv/bundling/node_modules/@jsenv/core/": {
      "@dmail/project-structure":
        "/node_modules/@jsenv/bundling/node_modules/@jsenv/core/node_modules/@dmail/project-structure/whatever.js",
    },
    "/node_modules/@jsenv/bundling/": {
      "@jsenv/core": "/node_modules/@jsenv/bundling/node_modules/@jsenv/core/whatever.js",
    },
  },
}
assert({ actual, expected })
