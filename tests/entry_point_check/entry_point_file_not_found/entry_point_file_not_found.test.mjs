import { assert } from "@jsenv/assert";
import { writeFile, removeEntry } from "@jsenv/filesystem";
import { resolveUrl, urlToFileSystemPath } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);
const mainJsFileUrl = resolveUrl("./main.js", testDirectoryUrl);
const test = async (params) => {
  const warnings = [];
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        ...params,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning);
    },
    writeFiles: false,
  });
  return { warnings, importmaps };
};
await removeEntry(mainJsFileUrl, { allowUseless: true });

{
  const importedFileUrl = `${testDirectoryUrl}main.js`;
  const actual = await test({
    entryPointsToCheck: ["./main.js"],
  });
  const expected = {
    warnings: [
      {
        code: "IMPORT_RESOLUTION_FAILED",
        message: `Import resolution failed for "./main.js"
--- import trace ---
entryPointsToCheck parameter
--- reason ---
file not found on filesystem at ${urlToFileSystemPath(importedFileUrl)}`,
      },
    ],
    importmaps: {
      "test.importmap": {
        imports: {},
        scopes: {},
      },
    },
  };
  assert({ actual, expected });
}

await writeFile(mainJsFileUrl);

{
  const actual = await test({
    entryPointsToCheck: ["./main.js"],
  });
  const expected = {
    warnings: [],
    importmaps: {
      "test.importmap": {
        imports: {},
        scopes: {},
      },
    },
  };
  assert({ actual, expected });
}
