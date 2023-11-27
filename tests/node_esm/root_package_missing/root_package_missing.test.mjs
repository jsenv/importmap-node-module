import { assert } from "@jsenv/assert";
import { resolveUrl } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);
const packageFileUrl = resolveUrl("./package.json", testDirectoryUrl);

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
