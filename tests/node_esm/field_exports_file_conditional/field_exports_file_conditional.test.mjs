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
        nodeMappings: {
          packageUserConditions,
        },
      },
    },
  });
  importmapFileSnapshot.compare();
};

await test({
  name: "node.importmap",
  packageUserConditions: ["node"],
});
await test({
  name: "browser.importmap",
  packageUserConditions: ["browser"],
});
