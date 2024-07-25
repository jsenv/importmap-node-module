import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

await snapshotWriteImportsMapsSideEffects(
  () =>
    writeImportmaps({
      logLevel: "warn",
      directoryUrl: new URL("./input/", import.meta.url),
      importmaps: {
        "test.importmap": {
          // manualImportmap allows to override the mapping found in package.json
          manualImportmap: {
            scopes: {
              "./node_modules/react-redux/": {
                react: "./node_modules/preact/compat/src/index.js",
              },
            },
          },
        },
      },
    }),
  import.meta.url,
  `./output/preact_override.md`,
);
