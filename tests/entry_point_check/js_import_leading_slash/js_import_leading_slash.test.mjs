import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

if (process.platform === "win32") {
  // TODO: make it work on windows
  process.exit(0);
}

const test = async (scenario, { runtime }) => {
  await snapshotWriteImportsMapsSideEffects(
    () =>
      writeImportmaps({
        logLevel: "warn",
        directoryUrl: new URL("./input/", import.meta.url),
        importmaps: {
          [`${scenario}.importmap`]: {
            importResolution: {
              entryPoints: ["./main.js"],
              runtime,
            },
          },
        },
      }),
    import.meta.url,
    `./output/${scenario}.md`,
  );
};

await test("0_leading_slash_browser", {
  runtime: "browser",
});
await test("1_leading_slash_node", {
  runtime: "node",
});
