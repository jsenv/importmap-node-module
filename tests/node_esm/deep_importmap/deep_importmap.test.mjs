import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL(
  "./root/src/directory/test.importmap",
  import.meta.url,
);
const importmapSnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportMapFiles({
  logLevel: "warn",
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "./src/directory/test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./src/directory/main.js"],
      removeUnusedMappings: true,
      magicExtensions: [".js"],
      manualImportMap: {
        imports: {
          "directory/": "./src/directory/",
        },
      },
    },
  },
});
importmapSnapshot.compare();
