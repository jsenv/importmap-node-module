import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportmaps } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps.js";

if (process.platform === "win32") {
  // TODO: make it work on windows
  process.exit(0);
}

const run = async ({ runtime }) => {
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: new URL("./input/", import.meta.url),
    importmaps: {
      [`test.importmap`]: {
        importResolution: {
          entryPoints: ["./main.js"],
          runtime,
        },
      },
    },
  });
};

await snapshotWriteImportmaps(import.meta.url, ({ test }) => {
  test("0_leading_slash_browser", () =>
    run({
      runtime: "browser",
    }));
  test("1_leading_slash_node", () =>
    run({
      runtime: "node",
    }));
});
