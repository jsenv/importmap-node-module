/*
 * When this file is executed it generates import map files
 * later used by web browser, and tools like jsenv and ESLint.
 * Importmap is a web standard allowing to control how JS imports are resolved.
 *
 * In practice, an import like
 * import { useSelector } from "react-redux"`
 * will be mapped to
 * "./node_modules/react-redux/es/index.js"
 *
 * see https://github.com/jsenv/importmap-node-module#writeImportmaps
 *
 */

import { writeImportmaps } from "@jsenv/importmap-node-module";

await writeImportmaps({
  directoryUrl: new URL("./", import.meta.url),
  importmaps: {
    "./project.importmap": {
      importResolution: {
        entryPoints: ["./main.html"],
        magicExtensions: ["inherit"],
      },
    },
  },
  packagesManualOverrides: {
    "react-redux": {
      exports: {
        import: "./es/index.js",
      },
    },
    "redux": {
      exports: {
        import: "es/redux.js",
      },
    },
  },
});
