import { assert } from "@jsenv/assert";
import { resolveUrl, urlToFileSystemPath } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);
const fooPackageJsonFileUrl = resolveUrl(
  "./node_modules/foo/package.json",
  testDirectoryUrl,
);

const test = async () => {
  const warnings = [];
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        entryPointsToCheck: ["./main.mjs"],
      },
    },
    onWarn: (warning) => {
      warnings.push(warning);
    },
    writeFiles: false,
    exportsFieldWarningConfig: { dependencies: true },
  });
  return { warnings, importmaps };
};

const actual = await test();
const expected = {
  warnings: [
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
  ],
  importmaps: {
    "test.importmap": {
      imports: {
        "root/": "./",
        "foo/": "./node_modules/foo/",
        "root": "./main.mjs",
        "foo": "./node_modules/foo/foo.js",
      },
      scopes: {},
    },
  },
};
assert({ actual, expected });
