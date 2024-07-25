import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

await snapshotWriteImportsMapsSideEffects(
  () =>
    writeImportmaps({
      logLevel: "warn",
      directoryUrl: new URL("./input/", import.meta.url),
      importmaps: {
        "./src/directory/test.importmap": {
          manualImportmap: {
            imports: {
              "directory/": "./src/directory/",
            },
          },
          importResolution: {
            entryPoints: ["./src/directory/main.js"],
            magicExtensions: [".js"],
          },
        },
      },
    }),
  import.meta.url,
  `./output/deep_importmap.md`,
);
