import { readFileSync } from "node:fs";
import { takeFileSnapshot } from "@jsenv/snapshot";
import { normalizeImportMap, resolveImport } from "@jsenv/importmap";
import { assert } from "@jsenv/assert";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapsnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  projectDirectoryUrl: testDirectoryUrl,
  importmaps: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      entryPoints: ["./index.js"],

      removeUnusedMappings: true,
    },
  },
});
importmapsnapshot.compare();

const importmap = JSON.parse(readFileSync(importmapFileUrl, "utf8"));
const importMapNormalized = normalizeImportMap(importmap, "http://example.com");
const actual = resolveImport({
  specifier: "lowclass-fake",
  importer: `http://example.com/node_modules/lume-fake/index.js`,
  importMap: importMapNormalized,
});
const expected = `http://example.com/node_modules/lume-fake/node_modules/lowclass-fake/dist/index.js`;
assert({ actual, expected });
