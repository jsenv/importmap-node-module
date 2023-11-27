import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportMapFiles({
  logLevel: "warn",
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      manualImportMap: {
        imports: {
          "http://example.com/foo.js": "http://example.com/bar.js",
        },
      },
      entryPointsToCheck: ["./index.js"],
      removeUnusedMappings: true,
    },
  },
});
importmapFileSnapshot.compare();
