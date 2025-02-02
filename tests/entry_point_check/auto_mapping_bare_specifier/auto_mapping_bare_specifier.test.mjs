import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportmaps } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps.js";

const run = async ({ bareSpecifierAutomapping }) => {
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: new URL("./input/", import.meta.url),
    importmaps: {
      [`test.importmap`]: {
        importResolution: {
          entryPoints: ["./index.js"],
          bareSpecifierAutomapping,
        },
      },
    },
  });
};

await snapshotWriteImportmaps(import.meta.url, ({ test }) => {
  test("0_bare_specifier_warning", () =>
    run({
      bareSpecifierAutomapping: undefined,
    }));
  test("1_bare_specifier_automapping", () =>
    run({
      bareSpecifierAutomapping: true,
    }));
});
