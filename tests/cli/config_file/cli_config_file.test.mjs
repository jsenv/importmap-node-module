import { assert } from "@jsenv/assert";
import { startBuildServer } from "@jsenv/core";
import { copyFileSync, replaceFileStructureSync } from "@jsenv/filesystem";
import { takeFileSnapshot } from "@jsenv/snapshot";
import { execSync } from "node:child_process";
import { executeHtml } from "../../execute_html.js";

const indexHtmlFileSnapshot = takeFileSnapshot(
  import.meta.resolve("./snapshots/index.html"),
);
replaceFileStructureSync({
  from: import.meta.resolve("./fixtures/"),
  to: import.meta.resolve("./git_ignored/"),
});
execSync(
  "node ../../../../src/cli.mjs ./index.html --config=importmap.config.json",
  {
    cwd: new URL(import.meta.resolve("./git_ignored/")),
  },
);
copyFileSync({
  from: import.meta.resolve("./git_ignored/index.html"),
  to: import.meta.resolve("./snapshots/index.html"),
});
indexHtmlFileSnapshot.compare();

const buildServer = await startBuildServer({
  buildDirectoryUrl: import.meta.resolve("./git_ignored/"),
  keepProcessAlive: false,
  port: 0,
  logLevel: "warn",
});
const actual = await executeHtml(`${buildServer.origin}/index.html`);
const expect = "axios";
assert({ actual, expect });
