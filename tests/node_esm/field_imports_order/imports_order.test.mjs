import { assert } from "@jsenv/assert";
import { resolveUrl } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const test = async ({ projectDirectoryUrl, runtime }) => {
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        entryPointsToCheck: ["./index.js"],
        removeUnusedMappings: true,
        runtime,
      },
    },
    writeFiles: false,
  });
  return importmaps["test.importmap"];
};
{
  const testDirectoryUrl = resolveUrl("./import_first/", import.meta.url);
  const actual = await test({
    projectDirectoryUrl: testDirectoryUrl,
    runtime: "node",
  });
  const expected = {
    imports: {
      "#foo": "./import.js",
    },
    scopes: {},
  };
  assert({ actual, expected });
}

{
  const testDirectoryUrl = resolveUrl("./node_first/", import.meta.url);
  const actual = await test({
    projectDirectoryUrl: testDirectoryUrl,
    runtime: "node",
  });
  const expected = {
    imports: {
      "#foo": "./node.js",
    },
    scopes: {},
  };
  assert({ actual, expected });
}
