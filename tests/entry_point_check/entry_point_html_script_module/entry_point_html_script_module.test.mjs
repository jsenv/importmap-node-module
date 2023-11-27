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
          a: "./a.js",
          b: "./b.js",
          inline_everything: "./everything.js",
          a_everything: "./everything.js",
          b_everything: "./everything.js",
          c_everything: "./everything.js",
        },
      },
      entryPointsToCheck: ["./main.html"],
      removeUnusedMappings: true,
    },
  },
});
importmapFileSnapshot.compare();
