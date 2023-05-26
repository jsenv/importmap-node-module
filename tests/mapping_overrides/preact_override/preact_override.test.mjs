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
      scopes: {
        "./node_modules/react-redux/": {
          react: "./node_modules/preact/compat/src/index.js",
        },
      },
    },
  });
  const expected = {
    imports: {
      "react-redux/": "./node_modules/react-redux/",
      "react-redux": "./node_modules/react-redux/index.js",
      "react/": "./node_modules/react/",
      "react": "./node_modules/react/index.js",
      "root/": "./",
      "root": "./index.js",
    },
    scopes: {
      "./node_modules/react-redux/": {
        react: "./node_modules/preact/compat/src/index.js", // GOOD
      },
    },
  };
  assert({ actual, expected });
}
