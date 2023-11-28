/*
 * A package import something from a dependency
 * that is not in its own package.json but in one of its dependency package.json
 */

import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapsnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  projectDirectoryUrl: testDirectoryUrl,
  importmaps: {
    "./test.importmap": {
      mappingsForNodeResolution: true,
      entryPoints: ["./index.js"],
      // magicExtensions: [".js"],

      removeUnusedMappings: true,
    },
  },
});
importmapsnapshot.compare();
