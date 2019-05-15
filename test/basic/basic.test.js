import { hrefToPathname, pathnameToDirname } from "@jsenv/module-resolution"
import { assert } from "@dmail/assert"
import { generateImportMapForProjectNodeModules } from "../../index.js"

const testFolder = pathnameToDirname(hrefToPathname(import.meta.url))
const actual = await generateImportMapForProjectNodeModules({
  projectFolder: testFolder,
  writeImportMapFile: false,
})
const expected = {
  imports: {
    "@dmail/yo/": "/node_modules/@dmail/yo/",
    "@dmail/yo": "/node_modules/@dmail/yo/index.js",
    "bar/": "/node_modules/bar/",
    "foo/": "/node_modules/foo/",
    bar: "/node_modules/bar/bar.js",
    foo: "/node_modules/foo/foo.js",
  },
  scopes: {
    "/node_modules/foo/node_modules/bar/": {
      "/node_modules/foo/node_modules/bar/": "/node_modules/foo/node_modules/bar/",
      "/": "/node_modules/foo/node_modules/bar/",
    },
    "/node_modules/@dmail/yo/": {
      "/node_modules/@dmail/yo/": "/node_modules/@dmail/yo/",
      "/": "/node_modules/@dmail/yo/",
    },
    "/node_modules/bar/": {
      "/node_modules/bar/": "/node_modules/bar/",
      "/": "/node_modules/bar/",
    },
    "/node_modules/foo/": {
      "/node_modules/foo/": "/node_modules/foo/",
      "bar/": "/node_modules/foo/node_modules/bar/",
      bar: "/node_modules/foo/node_modules/bar/index.js",
      "/": "/node_modules/foo/",
    },
  },
}
assert({
  actual,
  expected,
})
