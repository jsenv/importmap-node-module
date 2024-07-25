import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

await snapshotWriteImportsMapsSideEffects(
  () =>
    writeImportmaps({
      logLevel: "warn",
      directoryUrl: new URL("./input/", import.meta.url),
      importmaps: {
        "dev.importmap": {
          nodeMappings: {
            devDependencies: true,
          },
        },
        "prod.importmap": {},
      },
    }),
  import.meta.url,
  `./output/dev_and_prod.md`,
);
