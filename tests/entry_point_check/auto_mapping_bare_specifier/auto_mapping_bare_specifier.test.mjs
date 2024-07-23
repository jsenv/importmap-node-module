import { snapshotFunctionSideEffects } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const test = async (scenario, { bareSpecifierAutomapping }) => {
  await snapshotFunctionSideEffects(
    () =>
      writeImportmaps({
        logLevel: "warn",
        directoryUrl: new URL("./input/", import.meta.url),
        importmaps: {
          [`${scenario}.importmap`]: {
            importResolution: {
              entryPoints: ["./index.js"],
              bareSpecifierAutomapping,
            },
          },
        },
      }),
    import.meta.url,
    `./output/${scenario}/`,
    {
      filesystemEffects: [`./input/${scenario}.importmap`],
    },
  );
};

await test("0_default", {
  bareSpecifierAutomapping: undefined,
});
await test("1_bare_specifier_automapping", {
  bareSpecifierAutomapping: true,
});
