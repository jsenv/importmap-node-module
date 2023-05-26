import { assert } from "@jsenv/assert";
import { resolveUrl } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);
const test = async (options) => {
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        ...options,
      },
    },
    writeFiles: false,
  });
  return importmaps["test.importmap"];
};

// manualImportMap allows to override the mapping found in package.json
{
  const actual = await test({
    manualImportMap: {
      imports: {
        "./node_modules/foo/button.css": "./node_modules/foo/button.css.js",
      },
    },
  });
  const expected = {
    imports: {
      "./node_modules/foo/button.css": "./node_modules/foo/button.css.js",
      "root/": "./",
      "foo/": "./node_modules/foo/",
      "root": "./index",
      "foo": "./node_modules/foo/index",
    },
    scopes: {},
  };
  assert({ actual, expected });
}
