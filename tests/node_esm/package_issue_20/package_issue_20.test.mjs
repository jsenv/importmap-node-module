import { readFileSync } from "node:fs";
import { takeFileSnapshot } from "@jsenv/snapshot";
import { normalizeImportMap, resolveImport } from "@jsenv/importmap";
import { assert } from "@jsenv/assert";

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
      removeUnusedMappings: true,
    },
  },
});
importmapFileSnapshot.compare();

const importmap = JSON.parse(readFileSync(importmapFileUrl, "utf8"));
const importMapNormalized = normalizeImportMap(importmap, "http://example.com");
const actual = resolveImport({
  specifier: "lowclass-fake",
  importer: `http://example.com/node_modules/lume-fake/index.js`,
  importMap: importMapNormalized,
});
const expected = `http://example.com/node_modules/lume-fake/node_modules/lowclass-fake/dist/index.js`;
assert({ actual, expected });
