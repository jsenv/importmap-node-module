import { takeFileSnapshot } from "@jsenv/snapshot";
import { assert } from "@jsenv/assert";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);

const test = async ({ name, magicExtensions, expectedWarnings }) => {
  const importmapRelativeUrl = `${name}.importmap`;
  const importmapFileUrl = new URL(
    `./root/${importmapRelativeUrl}`,
    import.meta.url,
  );
  const importmapSnapshot = takeFileSnapshot(importmapFileUrl);
  const warnings = [];
  await writeImportMapFiles({
    logLevel: "warn",
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      [importmapRelativeUrl]: {
        mappingsForNodeResolution: true,
        entryPointsToCheck: ["./main.js"],
        removeUnusedMappings: true,
        magicExtensions,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning);
    },
  });
  importmapSnapshot.compare();
  const actual = warnings;
  const expected = expectedWarnings;
  assert({ actual, expected });
};

await test({
  name: "default",
  expectedWarnings: [
    {
      code: "IMPORT_RESOLUTION_FAILED",
      message: `Import resolution failed for "./file"
--- import trace ---
${testDirectoryUrl}node_modules/leftpad/index.js:1:7
> 1 | import "./file"
    |       ^
--- reason ---
file not found on filesystem at ${urlToFileSystemPath(
        `${testDirectoryUrl}node_modules/leftpad/file`,
      )}
--- suggestion 1 ---
update import specifier to "./file.js"
--- suggestion 2 ---
use magicExtensions: ["inherit"]
--- suggestion 3 ---
add mapping to "manualImportMap"
{
  "scopes": {
    "./node_modules/leftpad/": {
      "./node_modules/leftpad/file": "./node_modules/leftpad/file.js"
    }
  }
}`,
    },
  ],
});

await test({
  name: "magic_extensions_js",
  magicExtensions: [".js"],
  expectedWarnings: [
    {
      code: "IMPORT_RESOLUTION_FAILED",
      message: `Import resolution failed for "./other-file"
--- import trace ---
${testDirectoryUrl}node_modules/leftpad/file.js:1:7
> 1 | import "./other-file"
    |       ^
--- reason ---
file not found on filesystem at ${urlToFileSystemPath(
        `${testDirectoryUrl}node_modules/leftpad/other-file`,
      )}`,
    },
  ],
});

await test({
  name: "magic_extensions_inherit",
  magicExtensions: ["inherit", ".ts"],
  expectedWarnings: [],
});
