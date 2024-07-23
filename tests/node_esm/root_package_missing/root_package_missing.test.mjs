import { assert } from "@jsenv/assert";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const packageFileUrl = new URL("./package.json", testDirectoryUrl);

try {
  await writeImportmaps({
    directoryUrl: testDirectoryUrl,
    importmaps: {
      "test.importmap": {},
    },
  });
  throw new Error("should throw");
} catch (e) {
  const actual = e;
  const expect = new Error(`Cannot find root package.json file.
--- package.json url ---
${packageFileUrl}`);
  expect.code = "PROJECT_PACKAGE_FILE_NOT_FOUND";
  assert({ actual, expect });
}
