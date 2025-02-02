import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportmaps } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps.js";

const run = async () => {
  await writeImportmaps({
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
  });
};

await snapshotWriteImportmaps(import.meta.url, ({ test }) => {
  test("0_basic", () => run());
});
