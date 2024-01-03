import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const devImportmapFileUrl = new URL("./root/dev.importmap", import.meta.url);
const prodImportmapFileUrl = new URL("./root/prod.importmap", import.meta.url);
const devimportmapFileSnapshot = takeFileSnapshot(devImportmapFileUrl);
const prodimportmapFileSnapshot = takeFileSnapshot(prodImportmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  directoryUrl: testDirectoryUrl,
  importmaps: {
    "dev.importmap": {
      nodeMappings: {
        devDependencies: true,
      },
    },
    "prod.importmap": {},
  },
});
devimportmapFileSnapshot.compare();
prodimportmapFileSnapshot.compare();
