import { assert } from "@jsenv/assert";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const test = async (params) => {
  const warnings = [];
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: new URL("./project/", import.meta.url),
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
const { warnings, importmaps } = await test({
  entryPointsToCheck: ["./index.js"],
  magicExtensions: ["inherit"],
});
const actual = { warnings, importmaps };
const expected = {
  warnings: [],
  importmaps: {
    "test.importmap": {
      imports: {
        "./file": "./file.js",
      },
      scopes: {},
    },
  },
};
assert({ actual, expected });
