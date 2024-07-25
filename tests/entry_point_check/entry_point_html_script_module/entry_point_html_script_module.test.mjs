import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

await snapshotWriteImportsMapsSideEffects(
  () =>
    writeImportmaps({
      logLevel: "warn",
      directoryUrl: new URL("./input/", import.meta.url),
      importmaps: {
        "test.importmap": {
          manualImportmap: {
            imports: {
              a: "./a.js",
              b: "./b.js",
              inline_everything: "./everything.js",
              a_everything: "./everything.js",
              b_everything: "./everything.js",
              c_everything: "./everything.js",
            },
          },
          importResolution: {
            entryPoints: ["./main.html"],
          },
        },
      },
    }),
  import.meta.url,
  `./output/entry_point_html_script_module.md`,
);
