import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

const test = async (scenario, { bareSpecifierAutomapping }) => {
  await snapshotWriteImportsMapsSideEffects(
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
    `./output/${scenario}.md`,
  );
};

await test("0_bare_specifier_warning", {
  bareSpecifierAutomapping: undefined,
});
await test("1_bare_specifier_automapping", {
  bareSpecifierAutomapping: true,
});
