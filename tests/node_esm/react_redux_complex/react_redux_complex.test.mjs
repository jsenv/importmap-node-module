import { readFileSync } from "node:fs";
import { takeFileSnapshot } from "@jsenv/snapshot";
import { assert } from "@jsenv/assert";
import { normalizeImportMap, resolveImport } from "@jsenv/importmap";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);

const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportMapFiles({
  logLevel: "warn",
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./index.js"],
      magicExtensions: [".js"],
    },
  },
});
importmapFileSnapshot.compare();

const importmap = JSON.parse(readFileSync(importmapFileUrl, "utf8"));
const importMapNormalized = normalizeImportMap(importmap, "http://example.com");
const actual = resolveImport({
  specifier: "./utils/answer",
  importer: "http://example.com/node_modules/react-redux/es/index.js",
  importMap: importMapNormalized,
});
const expected =
  "http://example.com/node_modules/react-redux/es/utils/answer.js";
assert({ actual, expected });
