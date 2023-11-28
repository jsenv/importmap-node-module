import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./project.importmap": {
      mappingsForNodeResolution: true,
    },
  },
});
