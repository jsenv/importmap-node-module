import { assert } from "@jsenv/assert";
import { resolveUrl } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);
const warnings = [];
const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "./test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./index.js"],
      magicExtensions: ["inherit"],
      removeUnusedMappings: true,
    },
  },
  onWarn: (warning) => {
    warnings.push(warning);
  },
  writeFiles: false,
});

const actual = {
  warnings,
  importmap: importmaps["./test.importmap"],
};
const expected = {
  warnings: [],
  importmap: {
    imports: {
      "foo/file.js": "./node_modules/foo/file.js",
    },
    scopes: {},
  },
};
assert({ actual, expected });
