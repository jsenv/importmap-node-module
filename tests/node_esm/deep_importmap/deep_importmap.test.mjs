import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL(
  "./root/src/directory/test.importmap",
  import.meta.url,
);
const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  directoryUrl: testDirectoryUrl,
  importmaps: {
    "./src/directory/test.importmap": {
      mappingsForNodeResolution: true,
      manualImportmap: {
        imports: {
          "directory/": "./src/directory/",
        },
      },
      entryPoints: ["./src/directory/main.js"],
      magicExtensions: [".js"],

      removeUnusedMappings: true,
    },
  },
});
importmapFileSnapshot.compare();
