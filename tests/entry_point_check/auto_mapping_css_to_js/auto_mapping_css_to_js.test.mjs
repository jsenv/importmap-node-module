import { snapshotFunctionSideEffects } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const test = async () => {
  await snapshotFunctionSideEffects(
    () =>
      writeImportmaps({
        logLevel: "warn",
        directoryUrl: new URL("./input/", import.meta.url),
        importmaps: {
          "test.importmap": {
            importResolution: {
              entryPoints: ["./main.js"],
              magicExtensions: ["inherit"],
            },
          },
        },
      }),
    import.meta.url,
    `./output/`,
    {
      filesystemEffects: [`./input/test.importmap`],
      restoreFilesystem: true,
      filesystemEffectsInline: true,
    },
  );
};
await test();
