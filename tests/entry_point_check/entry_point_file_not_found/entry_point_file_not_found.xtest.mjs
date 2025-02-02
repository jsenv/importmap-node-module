import { replaceFileStructureSync } from "@jsenv/filesystem";
import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportmaps } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps.js";

const run = async (scenario) => {
  replaceFileStructureSync({
    from: new URL(`./fixtures/${scenario}/`, import.meta.url),
    to: new URL("./git_ignored/", import.meta.url),
  });
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: new URL("./git_ignored/", import.meta.url),
    importmaps: {
      "test.importmap": {
        importResolution: {
          entryPoints: ["./main.js"],
        },
      },
    },
  });
};

await snapshotWriteImportmaps(import.meta.url, ({ test }) => {
  test("0_not_found", () => run("0_not_found"));
  test("1_found", () => run("1_found"));
});
