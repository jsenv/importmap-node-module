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
      // manualImportMap allows to override the mapping found in package.json
      manualImportMap: {
        scopes: {
          "./node_modules/react-redux/": {
            react: "./node_modules/preact/compat/src/index.js",
          },
        },
      },
    },
  },
});
importmapFileSnapshot.compare();
