import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportmaps } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps.js";

const run = async () => {
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: new URL("./input/", import.meta.url),
    importmaps: {
      "./src/directory/test.importmap": {
        manualImportmap: {
          imports: {
            "directory/": "./src/directory/",
          },
        },
        importResolution: {
          entryPoints: ["./src/directory/main.js"],
          magicExtensions: [".js"],
        },
      },
    },
  });
};

await snapshotWriteImportmaps(import.meta.url, ({ test }) => {
  test("0_basic", () => run());
});
