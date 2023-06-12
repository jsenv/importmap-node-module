import { assert } from "@jsenv/assert";

import { importmapToVsCodeConfigPaths } from "@jsenv/importmap-node-module/src/internal/importmap_to_vscode_config_paths.js";

{
  const actual = importmapToVsCodeConfigPaths({
    imports: {
      "foo": "./node_modules/foo/index.js",
      "foo/": "./node_modules/foo/",
    },
  });
  const expected = {
    "foo": ["./node_modules/foo/index.js"],
    "foo/*": ["./node_modules/foo/*"],
  };
  assert({ actual, expected });
}
