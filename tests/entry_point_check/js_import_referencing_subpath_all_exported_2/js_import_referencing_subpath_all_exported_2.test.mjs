import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

await snapshotWriteImportsMapsSideEffects(
  () =>
    writeImportmaps({
      logLevel: "warn",
      directoryUrl: new URL("./input/", import.meta.url),
      importmaps: {
        "test.importmap": {
          nodeMappings: {
            devDependencies: true,
          },
          importResolution: {
            entryPoints: ["./index"],
            keepUnusedMappings: true,
          },
        },
      },
    }),
  import.meta.url,
  `./output/js_import_referencing_subpath_all_exported_2.md`,
);
