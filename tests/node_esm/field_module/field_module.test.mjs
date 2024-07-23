import { assert } from "@jsenv/assert";
import { removeEntrySync, writeFileSync } from "@jsenv/filesystem";
import { takeFileSnapshot } from "@jsenv/snapshot";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const rootMainJsFileUrl = new URL("./main.mjs", testDirectoryUrl);
const fooPackageJsonFileUrl = new URL(
  "./node_modules/foo/package.json",
  testDirectoryUrl,
);
const fooModuleJsFileUrl = new URL(
  "./node_modules/foo/module.mjs",
  testDirectoryUrl,
);

const test = async ({ name, expectedWarnings }) => {
  const importmapFileUrl = new URL(`./root/${name}`, import.meta.url);
  const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
  const warnings = [];
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: testDirectoryUrl,
    importmaps: {
      [name]: {
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
  importmapFileSnapshot.compare();
  const actual = warnings;
  const expected = expectedWarnings;
  assert({ actual, expected });
};

removeEntrySync(fooModuleJsFileUrl, { allowUseless: true });
const preferExportFieldWarning = {
  code: "PREFER_EXPORTS_FIELD",
  message: `A package is using a non-standard "module" field. To get rid of this warning check suggestion below
--- package.json path ---
${urlToFileSystemPath(fooPackageJsonFileUrl)}
--- suggestion ---
Add the following into "packageManualOverrides"
{
  "foo": {
    "exports": {
      "import": "./module.mjs"
    }
  }
}
As explained in https://github.com/jsenv/importmap-node-module#packagesmanualoverrides
--- suggestion 2 ---
Create a pull request in https://github.com/reduxjs/react-redux to use "exports" instead of "module"`,
};
await test({
  name: "module_field_file_not_found.importmap",
  expectedWarnings: [
    preferExportFieldWarning,
    {
      code: "PACKAGE_ENTRY_NOT_FOUND",
      message: `File not found for package.json "module" field
--- module ---
./module.mjs
--- package.json path ---
${urlToFileSystemPath(fooPackageJsonFileUrl)}
--- url tried ---
${urlToFileSystemPath(fooModuleJsFileUrl)}
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
        `${testDirectoryUrl}node_modules/foo/module.mjs`,
      )}`,
    },
  ],
});
writeFileSync(fooModuleJsFileUrl);
await test({
  name: "module_field_found.importmap",
  expectedWarnings: [preferExportFieldWarning],
});
