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
    "exporting-folder/": "./node_modules/foo/node_modules/exporting-folder/",
    "exporting-folder":
      "./node_modules/foo/node_modules/exporting-folder/index.js",
    "foo/ding": "./node_modules/foo/dong",
    "root/": "./",
    "root": "./index.js",
    "foo": "./node_modules/foo/index.js",
  },
  scopes: {},
};
assert({ actual, expected });
