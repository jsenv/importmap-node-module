import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const test = async ({ projectDirectoryUrl, runtime }) => {
  const importmapFileUrl = new URL("./test.importmap", projectDirectoryUrl);
  const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
  await writeImportMapFiles({
    logLevel: "warn",
    projectDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        entryPointsToCheck: ["./index.js"],
        removeUnusedMappings: true,
        runtime,
      },
    },
  });
  importmapFileSnapshot.compare();
};

await test({
  projectDirectoryUrl: new URL("./import_first/", import.meta.url),
  runtime: "node",
});
await test({
  projectDirectoryUrl: new URL("./node_first/", import.meta.url),
  runtime: "node",
});
