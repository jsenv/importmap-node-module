import { writeFileStructureSync } from "@jsenv/filesystem";
import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportsMapsSideEffects } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps_side_effects.js";

writeFileStructureSync(
  new URL("./fixtures/", import.meta.url),
  new URL("./git_ignored/", import.meta.url),
);
await snapshotWriteImportsMapsSideEffects(
  () =>
    writeImportmaps({
      logLevel: "warn",
      directoryUrl: new URL("./git_ignored/", import.meta.url),
      importmaps: {
        "index.html": {},
        "about.html": {},
      },
    }),
  import.meta.url,
  `./output/entry_point_many_2.md`,
);
