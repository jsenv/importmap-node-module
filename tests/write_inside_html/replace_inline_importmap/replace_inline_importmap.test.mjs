import { takeFileSnapshot } from "@jsenv/snapshot";
import { copyFileSync } from "@jsenv/filesystem";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const htmlFileUrl = new URL("./root/index.html", import.meta.url);
const htmlFileSnapshot = takeFileSnapshot(htmlFileUrl);
copyFileSync({
  from: new URL("./fixtures/index_initial.html", import.meta.url),
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
});
htmlFileSnapshot.compare();
