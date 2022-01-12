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
 * see https://github.com/jsenv/importmap-node-module#writeimportmapfiles
 *
 */

import { writeImportMapFiles } from "@jsenv/importmap-node-module"

await writeImportMapFiles({
  projectDirectoryUrl: new URL("./", import.meta.url),
  importMapFiles: {
    "./project.importmap": {
      runtime: "browser",
      mappingsForNodeResolution: true,
      entryPointsToCheck: ["./main.html"],
      magicExtensions: ["inherit"],
      removeUnusedMappings: true,
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
})
