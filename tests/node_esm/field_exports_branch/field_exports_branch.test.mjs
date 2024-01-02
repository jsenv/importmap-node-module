import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const test = async ({ name, runtime, packageUserConditions }) => {
  const importmapFileUrl = new URL(`./root/${name}`, import.meta.url);
  const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: testDirectoryUrl,
    importmaps: {
      [name]: {
        mappingsForNodeResolution: true,
        runtime,
        packageUserConditions,
      },
    },
  });
  importmapFileSnapshot.compare();
};

await test({
  name: "browser.importmap",
  runtime: "browser",
  packageUserConditions: ["development"],
});

await test({
  name: "node.importmap",
  runtime: "node",
  packageUserConditions: ["development"],
});
