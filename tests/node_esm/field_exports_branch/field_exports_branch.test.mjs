import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const test = async ({ name, packageUserConditions }) => {
  const importmapFileUrl = new URL(`./root/${name}`, import.meta.url);
  const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: testDirectoryUrl,
    importmaps: {
      [name]: {
        node_esm: {
          packageUserConditions,
        },
      },
    },
  });
  importmapFileSnapshot.compare();
};

await test({
  name: "browser.importmap",
  packageUserConditions: ["development", "browser"],
});

await test({
  name: "node.importmap",
  packageUserConditions: ["development", "node"],
});
