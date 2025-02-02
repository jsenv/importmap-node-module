import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportmaps } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps.js";

const run = async () => {
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: new URL("./input/", import.meta.url),
    importmaps: {
      "test.importmap": {
        manualImportmap: {
          imports: {
            a: "./a.js",
            b: "./b.js",
            inline_everything: "./everything.js",
            a_everything: "./everything.js",
            b_everything: "./everything.js",
            c_everything: "./everything.js",
          },
        },
        importResolution: {
          entryPoints: ["./main.html"],
        },
      },
    },
  });
};

await snapshotWriteImportmaps(import.meta.url, ({ test }) => {
  test("0_basic", () => run());
});
