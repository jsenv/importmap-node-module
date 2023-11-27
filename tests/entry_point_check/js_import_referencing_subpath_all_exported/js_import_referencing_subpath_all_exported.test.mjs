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
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
      entryPointsToCheck: ["./index.js"],
    },
  },
});
importmapFileSnapshot.compare();
