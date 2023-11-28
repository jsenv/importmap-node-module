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
      manualImportmap: {
        imports: {
          "http://example.com/foo.js": "http://example.com/bar.js",
        },
      },
      entryPoints: ["./index.js"],

      removeUnusedMappings: true,
    },
  },
});
importmapsnapshot.compare();
