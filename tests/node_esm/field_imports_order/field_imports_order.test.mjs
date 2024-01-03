import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const test = async ({ directoryUrl, packageUserConditions }) => {
  const importmapFileUrl = new URL("./test.importmap", directoryUrl);
  const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl,
    importmaps: {
      "test.importmap": {
        node_esm: {
          packageUserConditions,
        },
        import_resolution: {
          entryPoints: ["./index.js"],
        },
      },
    },
  });
  importmapFileSnapshot.compare();
};

await test({
  directoryUrl: new URL("./import_first/", import.meta.url),
  packageUserConditions: ["node"],
});
await test({
  directoryUrl: new URL("./node_first/", import.meta.url),
  packageUserConditions: ["node"],
});
