import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const test = async ({ projectDirectoryUrl, runtime }) => {
  const importmapFileUrl = new URL("./test.importmap", projectDirectoryUrl);
  const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
  await writeImportmaps({
    logLevel: "warn",
    projectDirectoryUrl,
    importmaps: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        entryPoints: ["./index.js"],

        removeUnusedMappings: true,
        runtime,
      },
    },
  });
  importmapFileSnapshot.compare();
};

await test({
  directoryUrl: new URL("./import_first/", import.meta.url),
  runtime: "node",
});
await test({
  directoryUrl: new URL("./node_first/", import.meta.url),
  runtime: "node",
});
