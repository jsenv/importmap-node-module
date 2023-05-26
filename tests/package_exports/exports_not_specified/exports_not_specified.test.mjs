import { assert } from "@jsenv/assert";
import { resolveUrl } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);

const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./index.js"],
      removeUnusedMappings: true,
    },
  },
  writeFiles: false,
});

const actual = importmaps["test.importmap"];
const expected = {
  imports: {
    "foo/": "./node_modules/foo/",
  },
  scopes: {},
};
assert({ actual, expected });
