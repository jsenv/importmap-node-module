import { assert } from "@jsenv/assert";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const packageFileUrl = new URL("./package.json", testDirectoryUrl);

try {
  await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
      },
    },
  });
  throw new Error("should throw");
} catch (e) {
  const actual = e;
  const expected = new Error(`Cannot find project package.json file.
--- package.json url ---
${packageFileUrl}`);
  expected.code = "PROJECT_PACKAGE_FILE_NOT_FOUND";
  assert({ actual, expected });
}
