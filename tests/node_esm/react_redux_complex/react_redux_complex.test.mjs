import { readFileSync } from "node:fs";
import { takeFileSnapshot } from "@jsenv/snapshot";
import { assert } from "@jsenv/assert";
import { normalizeImportMap, resolveImport } from "@jsenv/importmap";

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
      magicExtensions: [".js"],
    },
  },
});
importmapsnapshot.compare();

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
