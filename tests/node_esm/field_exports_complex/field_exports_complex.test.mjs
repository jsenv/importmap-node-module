import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const test = async ({ name, runtime, packageUserConditions }) => {
  const importmapFileUrl = new URL(`./root/${name}`, import.meta.url);
  const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
  await writeImportMapFiles({
    logLevel: "warn",
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
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
  name: "node.importmap",
  runtime: "node",
});
await test({
  name: "node_prefer_require.importmap",
  runtime: "node",
  packageUserConditions: ["require"],
});
await test({
  name: "browser.importmap",
  runtime: "browser",
});
await test({
  name: "browser_prefer_electron.importmap",
  runtime: "browser",
  packageUserConditions: ["electron"],
});
