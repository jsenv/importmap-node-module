import { assert } from "@jsenv/assert";
import { takeFileSnapshot } from "@jsenv/snapshot";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const rootPackageFileUrl = new URL("./package.json", testDirectoryUrl);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
const warnings = [];
await writeImportmaps({
  logLevel: "error",
  directoryUrl: testDirectoryUrl,
  importmaps: {
    "test.importmap": {},
  },
  onWarn: (warning) => {
    warnings.push(warning);
  },
});
importmapFileSnapshot.compare();

const actual = warnings;
const expected = [
  {
    code: "CANNOT_FIND_PACKAGE",
    message: `cannot find a dependency.
--- dependency ---
not-found@*
--- required by ---
${urlToFileSystemPath(rootPackageFileUrl)}`,
  },
];
assert({ actual, expected });
