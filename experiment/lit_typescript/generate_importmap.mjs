// eslint-disable-next-line import/no-unresolved
import { writeImportMapFiles } from "@jsenv/importmap-node-module";

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./dist/", import.meta.url),
  importMapFiles: {
    "./project.importmap": {
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./index.js"],
      magicExtensions: ["inherit"],
      removeUnusedMappings: true,
    },
  },
});
