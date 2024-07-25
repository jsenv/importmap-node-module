import { writeFileStructureSync } from "@jsenv/filesystem";
import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

const test = async (scenario, options) => {
  writeFileStructureSync(
    new URL("./git_ignored/", import.meta.url),
    new URL(`./fixtures/${scenario}/`, import.meta.url),
  );
  await snapshotWriteImportsMapsSideEffects(
    () =>
      writeImportmaps({
        logLevel: "warn",
        directoryUrl: new URL("./git_ignored/", import.meta.url),
        importmaps: {
          "index.html": {},
        },
        ...options,
      }),
    import.meta.url,
    `./output/${scenario}.md`,
  );
};
await test("0_html_no_importmap");
await test("1_html_importmap_empty", { logLevel: "error" });
await test("2_html_importmap_src");
