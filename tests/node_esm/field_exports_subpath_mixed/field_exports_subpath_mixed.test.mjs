import { takeFileSnapshot } from "@jsenv/snapshot";
import { assert } from "@jsenv/assert";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
const warnings = [];
await writeImportMapFiles({
  logLevel: "warn",
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
    },
  },
  onWarn: (warning) => {
    warnings.push(warning);
  },
});
importmapFileSnapshot.compare();

const fooPackageFileUrl = new URL(
  "./root/node_modules/foo/package.json",
  import.meta.url,
);
const actual = warnings;
const expected = [
  {
    code: "EXPORTS_SUBPATH_MIXED_KEYS",
    message: `unexpected keys in package.json exports: cannot mix relative and conditional keys
--- exports ---
{
  "require": "./index.js",
  "./file.js": "./src/file.js"
}
--- unexpected keys ---
"require"
--- package.json path ---
${urlToFileSystemPath(fooPackageFileUrl)}`,
  },
];
assert({ actual, expected });
