import { assert } from "@dmail/assert"
import { importMapToVsCodeConfigPaths } from "../../src/generateImportMapForProjectPackage/importMapToVsCodeConfigPaths.js"

{
  const actual = importMapToVsCodeConfigPaths({
    imports: {
      foo: "./node_modules/foo/index.js",
      "foo/": "./node_modules/foo/",
    },
  })
  const expected = {
    foo: ["./node_modules/foo/index.js"],
    "foo/*": ["./node_modules/foo/*"],
  }
  assert({ actual, expected })
}
