/*
 * A package import something from a dependency
 * that is not in its own package.json but in one of its dependency package.json
 */

import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  directoryUrl: testDirectoryUrl,
  importmaps: {
    "./test.importmap": {
      import_resolution: {
        entryPoints: ["./index.js"],
        // magicExtensions: [".js"],
      },
    },
  },
});
importmapFileSnapshot.compare();
