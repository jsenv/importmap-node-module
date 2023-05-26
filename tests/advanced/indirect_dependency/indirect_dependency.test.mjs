/*
 * A package import something from a dependency
 * that is not in its own package.json but in one of its dependency package.json
 */

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
      removeUnusedMappings: true,
      // magicExtensions: [".js"],
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
      b: "./node_modules/b/index.js",
    },
    scopes: {},
  },
};
assert({ actual, expected });
