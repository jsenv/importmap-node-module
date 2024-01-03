import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  directoryUrl: testDirectoryUrl,
  importmaps: {
    "test.importmap": {
      manualImportmap: {
        imports: {
          "http://example.com/foo.js": "http://example.com/bar.js",
        },
      },
      importResolution: {
        entryPoints: ["./index.js"],
      },
    },
  },
});
importmapFileSnapshot.compare();
