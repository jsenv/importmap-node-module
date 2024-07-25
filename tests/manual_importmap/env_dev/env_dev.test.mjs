import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

await snapshotWriteImportsMapsSideEffects(
  () =>
    writeImportmaps({
      logLevel: "warn",
      directoryUrl: new URL("./input/", import.meta.url),
      importmaps: {
        "test.importmap": {
          manualImportmap: {
            imports: {
              "#env": "./env.dev.js",
            },
          },
          importResolution: {
            entryPoints: ["./index.js"],
          },
        },
      },
    }),
  import.meta.url,
  `./output/env_dev.md`,
);
