import { takeFileSnapshot } from "@jsenv/snapshot";
import { assert } from "@jsenv/assert";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const test = async ({ bareSpecifierAutomapping }) => {
  const importmapRelativeUrl = bareSpecifierAutomapping
    ? "test_base_automapping.importmap"
    : "test.importmap";
  const importmapFileUrl = new URL(
    `./root/${importmapRelativeUrl}`,
    import.meta.url,
  );
  const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
  const warnings = [];
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: testDirectoryUrl,
    importmaps: {
      [importmapRelativeUrl]: {
        importResolution: {
          entryPoints: ["./index.js"],
          bareSpecifierAutomapping,
        },
      },
    },
    onWarn: (warning) => {
      warnings.push(warning);
    },
  });
  importmapFileSnapshot.compare();
  const actual = warnings;
  const expected = bareSpecifierAutomapping
    ? []
    : [
        {
          code: "importResolution_FAILED",
          message: `Import resolution failed for "file"
--- import trace ---
${testDirectoryUrl}index.js:2:7
  1 | // eslint-disable-next-line import/no-unresolved
> 2 | import "file";
    |       ^
  3 |${" "}
--- reason ---
there is no mapping for this bare specifier
--- suggestion 1 ---
update import specifier to "./file.js"
--- suggestion 2 ---
use bareSpecifierAutomapping: true
--- suggestion 3 ---
add mapping to "manualImportmap"
{
  "imports": {
    "file": "./file.js"
  }
}`,
        },
      ];
  assert({ actual, expected });

  return { warnings };
};

await test({});
await test({ bareSpecifierAutomapping: true });
