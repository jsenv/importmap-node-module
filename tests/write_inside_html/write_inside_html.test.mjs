import { takeDirectorySnapshot } from "@jsenv/snapshot";
import { copyFileSync } from "@jsenv/filesystem";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const snapshotDirectoryUrl = new URL("./snapshots/", import.meta.url);

const test = async (fixtureName, options) => {
  copyFileSync({
    from: new URL(`./fixtures/${fixtureName}`, import.meta.url),
    to: new URL("./root/index.html", import.meta.url),
    overwrite: true,
  });
  await writeImportmaps({
    logLevel: "warn",
    projectDirectoryUrl: testDirectoryUrl,
    importmaps: {
      "./index.html": {
        mappingsForNodeResolution: true,
        removeUnusedMappings: true,
      },
    },
    ...options,
  });
  copyFileSync({
    from: new URL("./root/index.html", import.meta.url),
    to: new URL(`./snapshots/${fixtureName}`, import.meta.url),
    overwrite: true,
  });
};

const directorySnapshot = takeDirectorySnapshot(snapshotDirectoryUrl);
await test("index_importmap_empty.html");
await test("index_importmap_with_src.html", { logLevel: "error" });
await test("index_without_importmap.html");
directorySnapshot.compare();
