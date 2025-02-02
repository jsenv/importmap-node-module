import { writeImportmaps } from "@jsenv/importmap-node-module";
import { takeFileSnapshot } from "@jsenv/snapshot";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  directoryUrl: testDirectoryUrl,
  importmaps: {
    "test.importmap": {},
  },
});
importmapFileSnapshot.compare();
