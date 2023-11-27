import { takeFileSnapshot } from "@jsenv/snapshot";
import { assert } from "@jsenv/assert";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const test = async ({ name, magicExtensions, expectedWarnings } = {}) => {
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
    packagesManualOverrides: {
      lodash: {
        exports: {
          "./*": "./*",
        },
      },
    },
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
  assert({
    actual: warnings,
    expected: expectedWarnings,
  });
};

await test({
  name: "magic_extensions_ts",
  magicExtensions: [".ts"],
  expectedWarnings: [
    {
      code: "IMPORT_RESOLUTION_FAILED",
      message: `Import resolution failed for "lodash/union"
--- import trace ---
${testDirectoryUrl}main.js:2:22
  1 | // eslint-disable-next-line import/no-unresolved
> 2 | import { union } from "lodash/union";
    |                      ^
  3 | 
--- reason ---
file not found on filesystem at ${urlToFileSystemPath(
        `${testDirectoryUrl}node_modules/lodash/union`,
      )}`,
    },
  ],
});

await test({
  name: "magic_extensions_js",
  magicExtensions: [".js"],
  expectedWarnings: [],
});
