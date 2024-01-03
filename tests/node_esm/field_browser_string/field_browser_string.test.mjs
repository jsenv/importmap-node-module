import { takeFileSnapshot } from "@jsenv/snapshot";
import { assert } from "@jsenv/assert";
import { removeEntrySync, writeFileSync } from "@jsenv/filesystem";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const rootMainJsFileUrl = new URL("./main.mjs", testDirectoryUrl);
const fooPackageJsonFileUrl = new URL(
  "./node_modules/foo/package.json",
  testDirectoryUrl,
);
const fooBrowserJsFileUrl = new URL(
  "./node_modules/foo/browser.js",
  testDirectoryUrl,
);

const test = async ({ name, runtime, expectedWarnings }) => {
  const importmapFileUrl = new URL(`./root/${name}`, import.meta.url);
  const importmapsnapshot = takeFileSnapshot(importmapFileUrl);
  const warnings = [];
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: testDirectoryUrl,
    importmaps: {
      [name]: {
        nodeMappings: {
          packageUserConditions: [runtime],
        },
        importResolution: {
          entryPoints: ["./main.mjs"],
          keepUnusedMappings: true,
        },
      },
    },
    onWarn: (warning) => {
      warnings.push(warning);
    },
    exportsFieldWarningConfig: { dependencies: true },
  });
  importmapsnapshot.compare();
  const actual = warnings;
  const expected = expectedWarnings;
  assert({ actual, expected });
};

removeEntrySync(fooBrowserJsFileUrl, { allowUseless: true });

const preferExportFieldWarning = {
  code: "PREFER_EXPORTS_FIELD",
  message: `A package is using a non-standard "browser" field. To get rid of this warning check suggestion below
--- package.json path ---
${urlToFileSystemPath(fooPackageJsonFileUrl)}
--- suggestion ---
Add the following into "packageManualOverrides"
{
  "foo": {
    "exports": {
      "browser": "./browser.js"
    }
  }
}
As explained in https://github.com/jsenv/importmap-node-module#packagesmanualoverrides
--- suggestion 2 ---
Create a pull request in https://github.com/foo/bar to use "exports" instead of "browser"`,
};

await test({
  name: "browser_while_entry_not_found.importmap",
  runtime: "browser",
  expectedWarnings: [
    preferExportFieldWarning,
    {
      code: "PACKAGE_ENTRY_NOT_FOUND",
      message: `File not found for package.json "browser" field
--- browser ---
./browser.js
--- package.json path ---
${urlToFileSystemPath(fooPackageJsonFileUrl)}
--- url tried ---
${urlToFileSystemPath(fooBrowserJsFileUrl)}
--- extensions tried ---
.js, .json, .node`,
    },
    {
      code: "IMPORT_RESOLUTION_FAILED",
      message: `Import resolution failed for "foo"
--- import trace ---
${rootMainJsFileUrl}:2:7
  1 | // eslint-disable-next-line import/no-unresolved
> 2 | import "foo";
    |       ^
  3 |${" "}
--- reason ---
file not found on filesystem at ${urlToFileSystemPath(
        `${testDirectoryUrl}node_modules/foo/browser.js`,
      )}`,
    },
  ],
});
writeFileSync(fooBrowserJsFileUrl);
await test({
  name: "browser_after_writing_entry.importmap",
  runtime: "browser",
  expectedWarnings: [preferExportFieldWarning],
});

await test({
  name: "node.importmap",
  runtime: "node",
  expectedWarnings: [],
});
