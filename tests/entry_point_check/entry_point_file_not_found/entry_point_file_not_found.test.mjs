import { assert } from "@jsenv/assert";
import { removeFileSync, writeFileSync } from "@jsenv/filesystem";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const mainJsFileUrl = new URL("./main.js", testDirectoryUrl);
const getWarnings = async () => {
  const warnings = [];
  await writeImportmaps({
    logLevel: "warn",
    directoryUrl: testDirectoryUrl,
    importmaps: {
      "test.importmap": {
        importResolution: {
          entryPoints: ["./main.js"],
        },
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
  const actual = await getWarnings();
  const expected = [
    {
      code: "IMPORT_RESOLUTION_FAILED",
      message: `Import resolution failed for "./main.js"
--- import trace ---
entryPoints parameter
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
  const actual = await getWarnings();
  const expected = [];
  assert({ actual, expected });
}
