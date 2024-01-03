import { takeFileSnapshot } from "@jsenv/snapshot";
import { assert } from "@jsenv/assert";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportmaps } from "@jsenv/importmap-node-module";

if (process.platform === "win32") {
  // TODO: make it work on windows
  process.exit(0);
}

const testDirectoryUrl = new URL("./root/", import.meta.url);
const test = async ({ name, runtime, expectedWarnings }) => {
  const importmapFileRelativeUrl = `${name}.importmap`;
  const importmapFileUrl = new URL(importmapFileRelativeUrl, testDirectoryUrl);
  const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
  const warnings = [];
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: testDirectoryUrl,
    importmaps: {
      [importmapFileRelativeUrl]: {
        runtime,
        entryPoints: ["./main.js"],

        removeUnusedMappings: true,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning);
    },
  });
  importmapFileSnapshot.compare();
  const actual = warnings;
  const expected = expectedWarnings;
  assert({ actual, expected });
};

await test({
  name: "runtime_browser",
  runtime: "browser",
  expectedWarnings: [],
});

await test({
  name: "runtime_node",
  runtime: "node",
  expectedWarnings: [
    {
      code: "importResolution_FAILED",
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
  ],
});
