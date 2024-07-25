import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

await snapshotWriteImportsMapsSideEffects(
  () =>
    writeImportmaps({
      logLevel: "warn",
      directoryUrl: new URL("./input/", import.meta.url),
      importmaps: {
        "./test.importmap": {
          importResolution: {
            entryPoints: ["./index.js"],
            magicExtensions: ["inherit"],
          },
        },
      },
    }),
  import.meta.url,
  `./output/extensionless_and_exports.md`,
);
