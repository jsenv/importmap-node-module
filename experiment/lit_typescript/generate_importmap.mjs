// eslint-disable-next-line import/no-unresolved
import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./dist/", import.meta.url),
  importmaps: {
    "./project.importmap": {
      import_resolution: {
        entryPoints: ["./index.js"],
        magicExtensions: ["inherit"],
      },
    },
  },
});
