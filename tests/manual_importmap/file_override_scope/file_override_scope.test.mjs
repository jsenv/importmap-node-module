import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL(`./root/test.importmap`, import.meta.url);
const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportMapFiles({
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./index.mjs"],
      removeUnusedMappings: true,
      manualImportMap: {
        scopes: {
          "./node_modules/foo/": {
            "bar/button.css": "./node_modules/bar/button.css.js",
          },
        },
      },
    },
  },
});
importmapFileSnapshot.compare();
