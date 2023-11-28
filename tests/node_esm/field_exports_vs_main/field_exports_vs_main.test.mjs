import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const test = async ({ name, runtime, packageUserConditions }) => {
  const importmapFileUrl = new URL(`./root/${name}`, import.meta.url);
  const importmapsnapshot = takeFileSnapshot(importmapFileUrl);
  await writeImportmaps({
    logLevel: "warn",
    projectDirectoryUrl: testDirectoryUrl,
    importmaps: {
      [name]: {
        mappingsForNodeResolution: true,
        runtime,
        packageUserConditions,
      },
    },
  });
  importmapsnapshot.compare();
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
