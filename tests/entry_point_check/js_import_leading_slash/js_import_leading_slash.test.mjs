import { assert } from "@jsenv/assert";
import { takeFileSnapshot } from "@jsenv/snapshot";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportmaps } from "@jsenv/importmap-node-module";

if (process.platform === "win32") {
  // TODO: make it work on windows
  process.exit(0);
}

const testDirectoryUrl = new URL("./root/", import.meta.url);
const test = async ({ name, runtime }) => {
  const importmapFileRelativeUrl = `${name}.importmap`;
  const importmapFileUrl = new URL(importmapFileRelativeUrl, testDirectoryUrl);
  const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
  const warnings = [];
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: testDirectoryUrl,
    importmaps: {
      [importmapFileRelativeUrl]: {
        importResolution: {
          runtime,
          entryPoints: ["./main.js"],
        },
      },
    },
    onWarn: (warning) => {
      warnings.push(warning);
    },
  });
  importmapFileSnapshot.compare();
  const actual = warnings;
  const expect =
    runtime === "node"
      ? [
          {
            code: "IMPORT_RESOLUTION_FAILED",
            message: `Import resolution failed for "/foo.js"
--- import trace ---
${testDirectoryUrl}main.js:2:7
  1 | // eslint-disable-next-line import/no-unresolved
> 2 | import "/foo.js";
    |       ^
  3 |${" "}
--- reason ---
file not found on filesystem at ${urlToFileSystemPath("file:///foo.js")}`,
          },
        ]
      : [];
  assert({ actual, expect });
};

await test({
  name: "runtime_browser",
  runtime: "browser",
});

await test({
  name: "runtime_node",
  runtime: "node",
});
