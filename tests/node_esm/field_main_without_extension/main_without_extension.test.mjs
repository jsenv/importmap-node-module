import { assert } from "@jsenv/assert";
import { resolveUrl } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
    },
  },
  writeFiles: false,
});

const actual = importmaps["test.importmap"];
const expected = {
  imports: {
    "main-without-extension/": "./node_modules/main-without-extension/",
    "main-without-extension": "./node_modules/main-without-extension/file.js",
    "root/": "./",
    "root": "./index.js",
  },
  scopes: {},
};
assert({ actual, expected });
