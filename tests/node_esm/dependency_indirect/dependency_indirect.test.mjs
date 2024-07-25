/*
 * A package import something from a dependency
 * that is not in its own package.json but in one of its dependency package.json
 */

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
            // magicExtensions: [".js"],
          },
        },
      },
    }),
  import.meta.url,
  `./output/dependency_indirect.md`,
);
