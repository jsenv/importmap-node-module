import { assert } from "@jsenv/assert";
import { resolveUrl } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);
const test = async (params) => {
  const warnings = [];
  const importmaps = await writeImportMapFiles({
    // logLevel: "debug",
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        ...params,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning);
    },
    writeFiles: false,
  });
  return { warnings, importmaps };
};

const actual = await test({
  manualImportMap: {
    imports: {
      a: "./a.js",
      b: "./b.js",
      inline_everything: "./everything.js",
      a_everything: "./everything.js",
      b_everything: "./everything.js",
      c_everything: "./everything.js",
    },
  },
  entryPointsToCheck: ["./main.html"],
  removeUnusedMappings: true,
});
const expected = {
  warnings: [],
  importmaps: {
    "test.importmap": {
      imports: {
        inline_everything: "./everything.js",
        a_everything: "./everything.js",
        b_everything: "./everything.js",
        c_everything: "./everything.js",
        a: "./a.js",
        // b.js is gone, no one needs it
      },
      scopes: {},
    },
  },
};
assert({ actual, expected });
