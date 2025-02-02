import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportmaps } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps.js";

const run = async ({ runtime }) => {
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: new URL("./input/", import.meta.url),
    importmaps: {
      [`test.importmap`]: {
        importResolution: {
          entryPoints: ["./index.js"],
          runtime,
        },
      },
    },
  });
};

await snapshotWriteImportmaps(import.meta.url, ({ test }) => {
  test("0_import_fs_browser", () =>
    run({
      runtime: "browser",
    }));
  test("1_import_fs_node", () =>
    run({
      runtime: "node",
    }));
});
