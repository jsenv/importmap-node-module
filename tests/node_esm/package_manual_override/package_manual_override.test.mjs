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
  packagesManualOverrides: {
    bar: {
      exports: {
        ".": "bar.js",
        "./": "./",
      },
    },
  },
  writeFiles: false,
});

const actual = importmaps["test.importmap"];
const expected = {
  imports: {
    "root/": "./",
    "bar/": "./node_modules/bar/",
    "root": "./index.js",
    "bar": "./node_modules/bar/bar.js",
  },
  scopes: {},
};
assert({ actual, expected });
