import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const devImportmapFileUrl = new URL("./root/dev.importmap", import.meta.url);
const prodImportmapFileUrl = new URL("./root/prod.importmap", import.meta.url);
const devImportmapFileSnapshot = takeFileSnapshot(devImportmapFileUrl);
const prodImportmapFileSnapshot = takeFileSnapshot(prodImportmapFileUrl);
await writeImportMapFiles({
  logLevel: "warn",
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "dev.importmap": {
      mappingsForNodeResolution: true,
      mappingsForDevDependencies: true,
    },
    "prod.importmap": {
      mappingsForNodeResolution: true,
    },
  },
});
devImportmapFileSnapshot.compare();
prodImportmapFileSnapshot.compare();
