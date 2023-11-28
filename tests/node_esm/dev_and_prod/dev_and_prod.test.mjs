import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const devImportmapFileUrl = new URL("./root/dev.importmap", import.meta.url);
const prodImportmapFileUrl = new URL("./root/prod.importmap", import.meta.url);
const devimportmapsnapshot = takeFileSnapshot(devImportmapFileUrl);
const prodimportmapsnapshot = takeFileSnapshot(prodImportmapFileUrl);
await writeImportmaps({
  logLevel: "warn",
  projectDirectoryUrl: testDirectoryUrl,
  importmaps: {
    "dev.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
    },
    "prod.importmap": {
      mappingsForNodeResolution: true,
    },
  },
});
devimportmapsnapshot.compare();
prodimportmapsnapshot.compare();
