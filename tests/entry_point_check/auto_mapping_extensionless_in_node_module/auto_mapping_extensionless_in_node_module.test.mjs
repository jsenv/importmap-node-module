import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportmaps } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps.js";

const run = async ({ magicExtensions } = {}) => {
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: new URL("./input/", import.meta.url),
    importmaps: {
      "test.importmap": {
        importResolution: {
          entryPoints: ["./main.js"],
          magicExtensions,
        },
      },
    },
  });
};

await snapshotWriteImportmaps(import.meta.url, ({ test }) => {
  test("0_magic_extensions_warning", () =>
    run({
      magicExtensions: undefined,
    }));
  test("1_magic_extensions_js", () =>
    run({
      magicExtensions: [".js"],
    }));
  test("2_magic_extensions_inherit", () =>
    run({
      magicExtensions: ["inherit", ".ts"],
    }));
});
