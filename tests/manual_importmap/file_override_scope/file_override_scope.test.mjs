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
            scopes: {
              "./node_modules/foo/": {
                "bar/button.css": "./node_modules/bar/button.css.js",
              },
            },
          },
          importResolution: {
            entryPoints: ["./index.mjs"],
          },
        },
      },
    }),
  import.meta.url,
  `./output/file_override_scope.md`,
);
