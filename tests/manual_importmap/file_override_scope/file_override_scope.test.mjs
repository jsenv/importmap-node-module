import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL(`./root/test.importmap`, import.meta.url);
const importmapsnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportmaps({
  projectDirectoryUrl: testDirectoryUrl,
  importmaps: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      manualImportmap: {
        scopes: {
          "./node_modules/foo/": {
            "bar/button.css": "./node_modules/bar/button.css.js",
          },
        },
      },
      entryPoints: ["./index.mjs"],

      removeUnusedMappings: true,
    },
  },
});
importmapsnapshot.compare();
