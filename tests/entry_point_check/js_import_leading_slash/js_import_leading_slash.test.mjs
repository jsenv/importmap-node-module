import { assert } from "@jsenv/assert";
import { resolveUrl, urlToFileSystemPath } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = resolveUrl("./root/", import.meta.url);
const test = async ({ runtime }) => {
  const warnings = [];
  const importmaps = await writeImportMapFiles({
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        runtime,
        entryPointsToCheck: ["./main.js"],
        removeUnusedMappings: true,
      },
    },
    onWarn: (warning) => {
      warnings.push(warning);
    },
    writeFiles: false,
  });
  return { warnings, importmaps };
};

// TODO: make it work on windows
if (process.platform !== "win32") {
  const actual = await test({ runtime: "browser" });
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

// TODO: make it work on windows
if (process.platform !== "win32") {
  const importedFileUrl = `file:///foo.js`;
  const actual = await test({ runtime: "node" });
  const expected = {
    warnings: [
      {
        code: "IMPORT_RESOLUTION_FAILED",
        message: `Import resolution failed for "/foo.js"
--- import trace ---
${testDirectoryUrl}main.js:2:7
  1 | // eslint-disable-next-line import/no-unresolved
> 2 | import "/foo.js";
    |       ^
  3 |${" "}
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
