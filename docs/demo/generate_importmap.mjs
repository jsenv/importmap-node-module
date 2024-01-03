import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./index.html": {},
  },
});
