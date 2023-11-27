import { takeFileSnapshot } from "@jsenv/snapshot";
import { removeEntrySync, writeSymbolicLinkSync } from "@jsenv/filesystem";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const fixturesDirectoryUrl = new URL("./fixtures/", import.meta.url);
const testDirectoryUrl = new URL("./fixtures/dir/", import.meta.url);

removeEntrySync(`${testDirectoryUrl}/node_modules/siesta`, {
  allowUseless: true,
});
try {
  writeSymbolicLinkSync({
    from: `${testDirectoryUrl}/node_modules/siesta`,
    to: fixturesDirectoryUrl,
  });
  const importmapFileUrl = new URL(
    "./fixtures/dir/test.importmap",
    import.meta.url,
  );
  const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
  await writeImportMapFiles({
    logLevel: "warn",
    projectDirectoryUrl: testDirectoryUrl,
    importMapFiles: {
      "test.importmap": {
        mappingsForNodeResolution: true,
        mappingsForDevDependencies: true,
        removeUnusedMappings: false,
        ignoreJsFiles: true,
      },
    },
  });
  importmapFileSnapshot.compare();
} finally {
  removeEntrySync(`${testDirectoryUrl}/node_modules/siesta`);
}
