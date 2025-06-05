import { copyFileSync, replaceFileStructureSync } from "@jsenv/filesystem";
import { takeFileSnapshot } from "@jsenv/snapshot";
import { execSync } from "node:child_process";

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
