import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);

const test = async ({ magicExtensions }) => {
  const importmapFileUrl = new URL(`./root/test.importmap`, import.meta.url);
  const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
  await writeImportMapFiles({
    logLevel: "warn",
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        entryPointsToCheck: ["./main.js"],
        removeUnusedMappings: true,
        magicExtensions,
      },
    },
  });
  importmapFileSnapshot.compare();
};

await test({
  magicExtensions: ["inherit"],
});
