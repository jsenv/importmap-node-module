import { assert } from "@jsenv/assert";
import { resolveUrl } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);

const test = async ({ runtime, packageUserConditions }) => {
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        runtime,
        packageUserConditions,
      },
    },
    writeFiles: false,
  });
  return importmaps["test.importmap"];
};

{
  const actual = await test({
    runtime: "node",
  });
  const expected = {
    imports: {
      whatever: "./main.mjs",
    },
    scopes: {},
  };
  assert({ actual, expected });
}

{
  const actual = await test({
    runtime: "node",
    packageUserConditions: ["require"],
  });
  const expected = {
    imports: {
      whatever: "./main-2.cjs",
    },
    scopes: {},
  };
  assert({ actual, expected });
}
