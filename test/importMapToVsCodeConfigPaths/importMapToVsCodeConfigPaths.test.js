import { assert } from "@jsenv/assert"
import { importMapToVsCodeConfigPaths } from "@jsenv/importmap-node-module/src/internal/importMapToVsCodeConfigPaths.js"

{
  const actual = importMapToVsCodeConfigPaths({
    imports: {
      "foo": "./node_modules/foo/index.js",
      "foo/": "./node_modules/foo/",
    },
  })
  const expected = {
    "foo": ["./node_modules/foo/index.js"],
    "foo/*": ["./node_modules/foo/*"],
  }
  assert({ actual, expected })
}
