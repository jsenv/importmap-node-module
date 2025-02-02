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
      "index.html": {},
    },
    ...options,
  });
};

await snapshotWriteImportmaps(import.meta.url, ({ test }) => {
  test("0_html_no_importmap", () => run("0_html_no_importmap"));
  test("1_html_importmap_empty", () =>
    run("1_html_importmap_empty", { logLevel: "error" }));
  test("2_html_importmap_src", () =>
    run("2_html_importmap_src", { logLevel: "error" }));
});
