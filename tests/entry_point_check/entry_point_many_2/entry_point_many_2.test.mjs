import { takeDirectorySnapshot } from "@jsenv/snapshot";
import { copyFileSync } from "@jsenv/filesystem";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const snapshotDirectoryUrl = new URL("./snapshots/", import.meta.url);

const directorySnapshot = takeDirectorySnapshot(snapshotDirectoryUrl);
copyFileSync({
  from: new URL(`./fixtures/index.html`, import.meta.url),
  to: new URL("./root/index.html", import.meta.url),
  overwrite: true,
});
copyFileSync({
  from: new URL(`./fixtures/about.html`, import.meta.url),
  to: new URL("./root/about.html", import.meta.url),
  overwrite: true,
});
await writeImportmaps({
  logLevel: "warn",
  projectDirectoryUrl: testDirectoryUrl,
  importmaps: {
    "index.html": {
      mappingsForNodeResolution: true,
      entryPoints: ["./about.html"],
      removeUnusedMappings: true,
    },
    "about.html": {
      mappingsForNodeResolution: true,
      entryPoints: ["./about.html"],
      removeUnusedMappings: true,
    },
  },
});
copyFileSync({
  from: new URL("./root/index.html", import.meta.url),
  to: new URL(`./snapshots/index.html`, import.meta.url),
  overwrite: true,
});
copyFileSync({
  from: new URL("./root/about.html", import.meta.url),
  to: new URL(`./snapshots/about.html`, import.meta.url),
  overwrite: true,
});
directorySnapshot.compare();
