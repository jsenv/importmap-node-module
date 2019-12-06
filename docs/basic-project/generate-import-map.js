const { pathToFileURL } = require("url")
const { generateImportMapForProjectPackage } = require("@jsenv/node-module-import-map")

generateImportMapForProjectPackage({
  projectDirectoryUrl: pathToFileURL(__dirname),
  includeDevDependencies: true,
  includeExports: true,
  includesImports: true,
  importMapFile: true,
  importMapFileRelativeUrl: "./importMap.json",
})
