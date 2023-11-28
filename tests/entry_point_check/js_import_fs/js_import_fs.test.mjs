import { takeFileSnapshot } from "@jsenv/snapshot";
import { assert } from "@jsenv/assert";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const test = async ({ name, runtime, expectedWarnings }) => {
  const importmapFileRelativeUrl = `${name}.importmap`;
  const importmapFileUrl = new URL(importmapFileRelativeUrl, testDirectoryUrl);
  const importmapsnapshot = takeFileSnapshot(importmapFileUrl);
  const warnings = [];
  await writeImportmaps({
    logLevel: "warn",
    projectDirectoryUrl: testDirectoryUrl,
    importmaps: {
      [importmapFileRelativeUrl]: {
        mappingsForNodeResolution: true,
        entryPoints: ["./index.js"],

        removeUnusedMappings: true,
        runtime,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning);
    },
  });
  importmapsnapshot.compare();
  const actual = warnings;
  const expected = expectedWarnings;
  assert({ actual, expected });
};

await test({
  name: "runtime_browser",
  expectedWarnings: [
    {
      code: "IMPORT_RESOLUTION_FAILED",
      message: `Import resolution failed for "fs"
--- import trace ---
${testDirectoryUrl}index.js:1:7
> 1 | import "fs";
    |       ^
  2 |${" "}
--- reason ---
there is no mapping for this bare specifier
--- suggestion 1 ---
use runtime: "node"`,
    },
  ],
});

await test({
  name: "runtime_node",
  runtime: "node",
  expectedWarnings: [],
});
