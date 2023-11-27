import { takeFileSnapshot } from "@jsenv/snapshot";

import { writeImportMapFiles } from "@jsenv/importmap-node-module";

const testDirectoryUrl = new URL("./root/", import.meta.url);
const importmapFileUrl = new URL("./root/test.importmap", import.meta.url);
const importmapFileSnapshot = takeFileSnapshot(importmapFileUrl);
await writeImportMapFiles({
  logLevel: "warn",
  projectDirectoryUrl: testDirectoryUrl,
  importMapFiles: {
    "test.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./index.js"],
      removeUnusedMappings: true,
    },
  },
});
importmapFileSnapshot.compare();

// does not work with file:// protocol because / leads to filesystemroot
// {
//   const importMapNormalized = normalizeImportMap(importMap, "http://example.com")
//   const actual = resolveImport({
//     specifier: "http://example.com/file-inside-bar.js",
//     importer: `http://example.com/node_modules/bar/bar.js`,
//     importMap: importMapNormalized,
//   })
//   const expected = `http://example.com/node_modules/bar/file-inside-bar.js`
//   assert({ actual, expected })
// }
