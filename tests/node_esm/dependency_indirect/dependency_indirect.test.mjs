/*
 * A package import something from a dependency
 * that is not in its own package.json but in one of its dependency package.json
 */

import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportmaps } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps.js";

const run = async () => {
  await writeImportmaps({
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
  });
};

await snapshotWriteImportmaps(import.meta.url, ({ test }) => {
  test("0_basic", () => run());
});
