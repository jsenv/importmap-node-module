import { assert } from "@jsenv/assert";
import { resolveUrl } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);
const test = async ({ runtime, packageUserConditions } = {}) => {
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
      "foo/dist/": "./node_modules/foo/dist/",
      "whatever/": "./",
      "whatever": "./index.js",
      "foo": "./node_modules/foo/dist/rollup.mjs",
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
      "foo/dist/": "./node_modules/foo/dist/",
      "whatever/": "./",
      "whatever": "./index.js",
      "foo": "./node_modules/foo/dist/rollup.js",
    },
    scopes: {},
  };
  assert({ actual, expected });
}

{
  const actual = await test({
    runtime: "browser",
    packageUserConditions: ["electron"],
  });
  const expected = {
    imports: {
      "foo/dist/": "./node_modules/foo/dist/",
      "whatever/": "./",
      "whatever": "./index.js",
      "foo": "./node_modules/foo/dist/rollup.browser.mjs",
    },
    scopes: {},
  };
  assert({ actual, expected });
}

{
  const actual = await test({
    runtime: "browser",
  });
  const expected = {
    imports: {
      "foo/dist/": "./node_modules/foo/dist/",
      "whatever/": "./",
      "whatever": "./index.js",
      "foo": "./node_modules/foo/dist/rollup.browser.mjs",
    },
    scopes: {},
  };
  assert({ actual, expected });
}
