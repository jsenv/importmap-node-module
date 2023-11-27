import { takeFileSnapshot } from "@jsenv/snapshot";
import { assert } from "@jsenv/assert";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const rootPackageFileUrl = new URL("./package.json", testDirectoryUrl);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
const warnings = [];
await writeImportMapFiles({
  logLevel: "error",
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
