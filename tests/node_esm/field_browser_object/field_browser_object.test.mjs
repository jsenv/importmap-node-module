import { assert } from "@jsenv/assert";
import { takeFileSnapshot } from "@jsenv/snapshot";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
const warnings = [];
await writeImportmaps({
  logLevel: "warn",
  directoryUrl: testDirectoryUrl,
  importmaps: {
    "test.importmap": {
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

const fooPackageJsonFileUrl = new URL(
  "./node_modules/foo/package.json",
  testDirectoryUrl,
);
const actual = warnings;
const expect = [
  {
    code: "BROWSER_FIELD_NOT_IMPLEMENTED",
    message: `Found an object "browser" field in a package.json, this is not supported.
--- package.json path ---
${urlToFileSystemPath(fooPackageJsonFileUrl)}
--- suggestion ---
Add the following into "packageManualOverrides"
{
  "foo": {
    "exports": {
      "browser": {
        "./platform.js": "./platform_browser.js"
      }
    }
  }
}
As explained in https://github.com/jsenv/importmap-node-module#packagesmanualoverrides`,
  },
];
assert({ actual, expect });
