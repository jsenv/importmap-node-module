import { assert } from "@jsenv/assert";
import { resolveUrl } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
    },
  },
  writeFiles: false,
});

const actual = importmaps["test.importmap"];
const expected = {
  imports: {
    "@jsenv/core/conflict": "./root.js",
    "@jsenv/core/rootonly": "./rootonly.js",
    "@jsenv/core/deponly": "./node_modules/@jsenv/core/deponly.js",
    "@jsenv/core": "./index.js",
  },
  scopes: {
    "./node_modules/@jsenv/core/": {
      "@jsenv/core/conflict": "./node_modules/@jsenv/core/dep.js",
      "@jsenv/core": "./node_modules/@jsenv/core/maindep.js",
    },
  },
};
assert({ actual, expected });
