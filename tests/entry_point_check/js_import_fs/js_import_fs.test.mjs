import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

const test = async (scenario, { runtime }) => {
  await snapshotWriteImportsMapsSideEffects(
    () =>
      writeImportmaps({
        logLevel: "warn",
        directoryUrl: new URL("./input/", import.meta.url),
        importmaps: {
          [`${scenario}.importmap`]: {
            importResolution: {
              entryPoints: ["./index.js"],
              runtime,
            },
          },
        },
      }),
    import.meta.url,
    `./output/${scenario}.md`,
  );
};

await test("0_import_fs_browser", {
  runtime: "browser",
});
await test("1_import_fs_node", {
  runtime: "node",
});
