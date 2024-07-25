import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

const test = async () => {
  await snapshotWriteImportsMapsSideEffects(
    () =>
      writeImportmaps({
        logLevel: "warn",
        directoryUrl: new URL("./input/", import.meta.url),
        importmaps: {
          "test.importmap": {
            importResolution: {
              entryPoints: ["./main.js"],
              magicExtensions: ["inherit"],
            },
          },
        },
      }),
    import.meta.url,
    `./output/auto_mapping_css_to_js.md`,
  );
};
await test();
