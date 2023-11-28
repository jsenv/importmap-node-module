import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const fixturesDirectoryUrl = new URL("./fixtures/", import.meta.url);
const importmapFileUrl = new URL("./fixtures/index.html", import.meta.url);
const importmapsnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  projectDirectoryUrl: fixturesDirectoryUrl,
  importmaps: {
    "./index.html": {
      mappingsForNodeResolution: true,
      entryPoints: ["./index.html"],
      removeUnusedMappings: true,
    },
  },
});
importmapsnapshot.compare();
