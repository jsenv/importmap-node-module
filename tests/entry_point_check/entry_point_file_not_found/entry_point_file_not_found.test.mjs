import { writeFileStructureSync } from "@jsenv/filesystem";
import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

const test = async (scenario) => {
  writeFileStructureSync(
    new URL("./git_ignored/", import.meta.url),
    new URL(`./fixtures/${scenario}/`, import.meta.url),
  );
  await snapshotWriteImportsMapsSideEffects(
    () =>
      writeImportmaps({
        logLevel: "warn",
        directoryUrl: new URL("./git_ignored/", import.meta.url),
        importmaps: {
          "test.importmap": {
            importResolution: {
              entryPoints: ["./main.js"],
            },
          },
        },
      }),
    import.meta.url,
    `./output/${scenario}.md`,
  );
};

await test("0_not_found");
await test("1_found");
