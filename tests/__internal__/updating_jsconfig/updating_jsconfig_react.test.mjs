import { copyFileSync } from "@jsenv/filesystem";
import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportmaps } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./", import.meta.url);
const jsConfigFileUrl = new URL("jsconfig.json", testDirectoryUrl);
const jsConfigFileSnapshot = takeFileSnapshot(jsConfigFileUrl);
copyFileSync({
  from: new URL("./fixtures/jsconfig_start.json", import.meta.url),
  to: new URL("./jsconfig.json", import.meta.url),
  overwrite: true,
});
await writeImportmaps({
  logLevel: "warn",
  directoryUrl: testDirectoryUrl,
  importmaps: {
    "test.importmap": {
      nodeMappings: false,
      // importResolution: false,
      manualImportmap: {
        imports: { foo: "./bar.js" },
      },
      useForJsConfigJSON: true,
    },
  },
});
jsConfigFileSnapshot.compare();
