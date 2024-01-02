// eslint-disable-next-line import/no-unresolved
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./dist/", import.meta.url),
  importmaps: {
    "./project.importmap": {
      mappingsForNodeResolution: true,
      entryPoints: ["./index.js"],
      magicExtensions: ["inherit"],

      removeUnusedMappings: true,
    },
  },
});
