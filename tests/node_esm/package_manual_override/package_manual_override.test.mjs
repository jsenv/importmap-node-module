import { takeFileSnapshot } from "@jsenv/snapshot";

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
    },
  },
  packagesManualOverrides: {
    bar: {
      exports: {
        ".": "bar.js",
        "./": "./",
      },
    },
  },
});
importmapsnapshot.compare();
