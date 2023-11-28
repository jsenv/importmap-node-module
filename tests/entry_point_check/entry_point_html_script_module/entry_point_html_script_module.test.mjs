import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapsnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  projectDirectoryUrl: testDirectoryUrl,
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
      entryPoints: ["./main.html"],

      removeUnusedMappings: true,
    },
  },
});
importmapsnapshot.compare();
