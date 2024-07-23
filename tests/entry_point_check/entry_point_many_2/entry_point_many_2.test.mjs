import { copyFileSync } from "@jsenv/filesystem";
import { takeDirectorySnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const snapshotDirectoryUrl = new URL("./snapshots/", import.meta.url);

const restoreFixtures = () => {
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
};

const directorySnapshot = takeDirectorySnapshot(snapshotDirectoryUrl);
restoreFixtures();
await writeImportmaps({
  logLevel: "warn",
  directoryUrl: testDirectoryUrl,
  importmaps: {
    "index.html": {},
    "about.html": {},
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
restoreFixtures();
directorySnapshot.compare();
