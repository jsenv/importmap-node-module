import { extname } from "path"

export const packageDataToMain = (packageData) => {
  if ("module" in packageData) return normalizePackageMain(packageData.module)
  if ("jsnext:main" in packageData) return normalizePackageMain(packageData["jsnext:main"])
  if ("main" in packageData) return normalizePackageMain(packageData.main)
  // in theory we should try several extension
  // let's not do this and assume .js for now
  return "index.js"
}

const normalizePackageMain = (main) => {
  // normalize in case people write ./dist/file for instance
  if (main.slice(0, 2) === "./") main = main.slice(2)
  const extension = extname(main)
  if (extension) return main
  return `${main}.js`
}
