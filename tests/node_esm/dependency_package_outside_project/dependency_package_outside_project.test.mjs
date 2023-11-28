import { takeFileSnapshot } from "@jsenv/snapshot";
import { assert } from "@jsenv/assert";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);

const test = async ({ name, runtime, expectedWarnings }) => {
  const importmapFileUrl = new URL(`./root/${name}`, import.meta.url);
  const importmapsnapshot = takeFileSnapshot(importmapFileUrl);
  const warnings = [];
  await writeImportmaps({
    logLevel: "warn",
    projectDirectoryUrl: testDirectoryUrl,
    importmaps: {
      [name]: {
        mappingsForNodeResolution: true,
        runtime,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning);
    },
  });
  importmapsnapshot.compare();
  const actual = warnings;
  const expected = expectedWarnings;
  assert({ actual, expected });
};

// not found for browser runtime
await test({
  name: "browser.importmap",
  runtime: "browser",
  expectedWarnings: [
    {
      code: "CANNOT_FIND_PACKAGE",
      message: `cannot find a dependency.
--- dependency ---
foo@*
--- required by ---
${urlToFileSystemPath(new URL("./root/package.json", import.meta.url))}`,
    },
  ],
});

// found when runtime is node
await test({
  name: "node.importmap",
  runtime: "node",
  expectedWarnings: [],
});
