import { assert } from "@jsenv/assert";
import { resolveUrl } from "@jsenv/urls";
import { normalizeImportMap, resolveImport } from "@jsenv/importmap";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);

const importmaps = await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./index.js"],
      magicExtensions: [".js"],
    },
  },
  writeFiles: false,
});

const importmap = importmaps["test.importmap"];
const actual = importmap;
const expected = {
  imports: {
    "react-redux": "./node_modules/react-redux/es/index.js",
    "whatever/": "./",
    "whatever": "./index.js",
  },
  scopes: {
    "./node_modules/react-redux/": {
      "./node_modules/react-redux/es/utils/answer":
        "./node_modules/react-redux/es/utils/answer.js",
    },
  },
};
assert({ actual, expected });

{
  const importMapNormalized = normalizeImportMap(
    importmap,
    "http://example.com",
  );
  const actual = resolveImport({
    specifier: "./utils/answer",
    importer: "http://example.com/node_modules/react-redux/es/index.js",
    importMap: importMapNormalized,
  });
  const expected =
    "http://example.com/node_modules/react-redux/es/utils/answer.js";
  assert({ actual, expected });
}
