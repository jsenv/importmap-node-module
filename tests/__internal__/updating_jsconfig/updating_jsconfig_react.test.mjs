import { takeFileSnapshot } from "@jsenv/snapshot";
import { copyFileSync } from "@jsenv/filesystem";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./", import.meta.url);
const jsConfigFileUrl = new URL("jsconfig.json", testDirectoryUrl);

const jsConfigSnapshot = takeFileSnapshot(jsConfigFileUrl);
copyFileSync({
  from: new URL("./fixtures/jsconfig_start.json", import.meta.url),
  to: new URL("./jsconfig.json", import.meta.url),
  overwrite: true,
});
await writeImportMapFiles({
  logLevel: "warn",
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      manualImportMap: {
        imports: { foo: "./bar.js" },
      },
      useForJsConfigJSON: true,
    },
  },
});
jsConfigSnapshot.compare();
