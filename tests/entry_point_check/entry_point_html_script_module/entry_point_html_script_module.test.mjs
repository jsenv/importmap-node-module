import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  directoryUrl: testDirectoryUrl,
  importmaps: {
    "test.importmap": {
      manualImportmap: {
        imports: {
          a: "./a.js",
          b: "./b.js",
          inline_everything: "./everything.js",
          a_everything: "./everything.js",
          b_everything: "./everything.js",
          c_everything: "./everything.js",
        },
      },
      importResolution: {
        entryPoints: ["./main.html"],
      },
    },
  },
});
importmapFileSnapshot.compare();
