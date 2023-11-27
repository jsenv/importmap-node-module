import { assert } from "@jsenv/assert";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const errorCalls = [];
const consoleError = console.error;
console.error = (message) => {
  errorCalls.push(message);
};
try {
  await writeImportMapFiles({
    logLevel: "off",
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        entryPointsToCheck: ["./index.js"],
        removeUnusedMappings: true,
      },
    },
  });
  const actual = errorCalls;
  const expected = [
    `error while parsing package.json.
--- syntax error message ---
Unexpected end of JSON input
--- package.json path ---
${urlToFileSystemPath(
  new URL("root/node_modules/malformed/package.json", import.meta.url),
)}
`,
  ];
  assert({ actual, expected });
} finally {
  console.error = consoleError;
}
