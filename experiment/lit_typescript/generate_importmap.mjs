import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./dist/", import.meta.url),
  importmaps: {
    "./project.importmap": {
      importResolution: {
        entryPoints: ["./index.js"],
        magicExtensions: ["inherit"],
      },
    },
  },
});
