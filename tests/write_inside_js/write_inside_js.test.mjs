import { startBuildServer } from "@jsenv/core";
import { replaceFileStructureSync } from "@jsenv/filesystem";
import { writeImportmaps } from "@jsenv/importmap-node-module";
import { snapshotWriteImportmaps } from "@jsenv/importmap-node-module/tests/snapshot_write_importmaps.js";
import { executeHtml } from "../execute_html.js";

const run = async (scenario, options) => {
  replaceFileStructureSync({
    from: import.meta.resolve(`./fixtures/${scenario}/`),
    to: import.meta.resolve("./git_ignored/"),
  });
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: import.meta.resolve("./git_ignored/"),
    importmaps: {
      "importmap.js": {},
    },
    ...options,
  });
  const buildServer = await startBuildServer({
    buildDirectoryUrl: import.meta.resolve("./git_ignored/"),
    keepProcessAlive: false,
    port: 0,
    logLevel: "warn",
  });
  return executeHtml(`${buildServer.origin}/index.html`);
};

await snapshotWriteImportmaps(
  import.meta.url,
  ({ test }) => {
    test("0_basic", () => run("0_basic"));
  },
  { filesystemEffects: false },
);
