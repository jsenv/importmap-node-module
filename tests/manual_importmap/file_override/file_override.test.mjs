import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL(`./root/test.importmap`, import.meta.url);
const importmapsnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  projectDirectoryUrl: testDirectoryUrl,
  importmaps: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      // manualImportmap allows to override the mapping found in package.json
      manualImportmap: {
        imports: {
          "./node_modules/foo/button.css": "./node_modules/foo/button.css.js",
        },
      },
    },
  },
});
importmapsnapshot.compare();
