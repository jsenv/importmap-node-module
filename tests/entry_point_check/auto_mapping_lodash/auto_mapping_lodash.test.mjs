import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

const test = async (scenario, { magicExtensions }) => {
  await snapshotWriteImportsMapsSideEffects(
    () =>
      writeImportmaps({
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
      }),
    import.meta.url,
    `./output/${scenario}.md`,
  );
};

await test("0_magic_extensions_ts", {
  magicExtensions: [".ts"],
});
await test("1_magic_extensions_js", {
  magicExtensions: [".js"],
});
