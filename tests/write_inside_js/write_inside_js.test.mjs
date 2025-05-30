import { replaceFileStructureSync } from "@jsenv/filesystem";
import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportmaps } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps.js";

const run = async (scenario, options) => {
  replaceFileStructureSync({
    from: new URL(`./fixtures/${scenario}/`, import.meta.url),
    to: new URL("./git_ignored/", import.meta.url),
  });
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: new URL("./git_ignored/", import.meta.url),
    importmaps: {
      "index.js": {},
    },
    ...options,
  });
};

await snapshotWriteImportmaps(import.meta.url, ({ test }) => {
  test("0_basic", () => run("0_basic"));
});
