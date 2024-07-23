import { assert } from "@jsenv/assert";
import { normalizeImportMap, resolveImport } from "@jsenv/importmap";
import { takeFileSnapshot } from "@jsenv/snapshot";
import { readFileSync } from "node:fs";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);

const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  directoryUrl: testDirectoryUrl,
  importmaps: {
    "test.importmap": {
      importResolution: {
        entryPoints: ["./index.js"],
        magicExtensions: [".js"],
        keepUnusedMappings: true,
      },
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
const expect = "http://example.com/node_modules/react-redux/es/utils/answer.js";
assert({ actual, expect });
