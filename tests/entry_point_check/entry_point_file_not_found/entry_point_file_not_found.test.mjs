import { assert } from "@jsenv/assert";
import { writeFileSync, removeFileSync } from "@jsenv/filesystem";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const mainJsFileUrl = new URL("./main.js", testDirectoryUrl);
const getWarnings = async (params) => {
  const warnings = [];
  await writeImportMapFiles({
    logLevel: "warn",
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        ...params,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning);
    },
  });
  return warnings;
};

removeFileSync(mainJsFileUrl, { allowUseless: true });
{
  const actual = await getWarnings({
    entryPointsToCheck: ["./main.js"],
  });
  const expected = [
    {
      code: "IMPORT_RESOLUTION_FAILED",
      message: `Import resolution failed for "./main.js"
--- import trace ---
entryPointsToCheck parameter
--- reason ---
file not found on filesystem at ${urlToFileSystemPath(
        `${testDirectoryUrl}main.js`,
      )}`,
    },
  ];
  assert({ actual, expected });
}

writeFileSync(mainJsFileUrl);
{
  const actual = await getWarnings({
    entryPointsToCheck: ["./main.js"],
  });
  const expected = [];
  assert({ actual, expected });
}
