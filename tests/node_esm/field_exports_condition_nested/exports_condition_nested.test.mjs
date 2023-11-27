import { assert } from "@jsenv/assert";
import { resolveUrl } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);
const test = async ({ runtime } = {}) => {
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        runtime,
      },
    },
    writeFiles: false,
  });
  return importmaps["test.importmap"];
};

{
  const importMap = await test({
    runtime: "node",
  });
  const actual = importMap;
  const expected = {
    imports: {
      "root/": "./",
      "root": "./index.js",
      "foo": "./node_modules/foo/feature-node.mjs",
    },
    scopes: {},
  };
  assert({ actual, expected });
}

{
  const importMap = await test({
    runtime: "browser",
  });
  const actual = importMap;
  const expected = {
    imports: {
      "root/": "./",
      "root": "./index.js",
      "foo": "./node_modules/foo/feature.mjs",
    },
    scopes: {},
  };
  assert({ actual, expected });
}
