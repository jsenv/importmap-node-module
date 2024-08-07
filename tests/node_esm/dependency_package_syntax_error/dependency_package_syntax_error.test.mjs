import { assert } from "@jsenv/assert";
import { urlToFileSystemPath } from "@jsenv/urls";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const errorCalls = [];
const consoleError = console.error;
console.error = (message) => {
  errorCalls.push(message);
};
try {
  await writeImportmaps({
    logLevel: "off",
    directoryUrl: testDirectoryUrl,
    importmaps: {
      "test.importmap": {
        importResolution: {
          entryPoints: ["./index.js"],
        },
      },
    },
  });
  const actual = errorCalls;
  const expect = [
    `error while parsing package.json.
--- syntax error message ---
Unexpected end of JSON input
--- package.json path ---
${urlToFileSystemPath(
  new URL("root/node_modules/malformed/package.json", import.meta.url),
)}
`,
  ];
  assert({ actual, expect });
} finally {
  console.error = consoleError;
}
