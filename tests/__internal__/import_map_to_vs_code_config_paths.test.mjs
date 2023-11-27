import { assert } from "@jsenv/assert";

import { importmapToVsCodeConfigPaths } from "@jsenv/importmap-node-module/src/step_jsconfig/update_js_config_for_vscode.js";

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
