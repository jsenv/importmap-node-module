const { readFileSync, writeFileSync } = require("fs")
const { resolve } = require("path")

const PACKAGE_PATH = resolve(__dirname, "../../package.json")
const PACKAGE_CACHED_PATH = resolve(__dirname, "../../cached-package.json")

const packageString = String(readFileSync(PACKAGE_PATH))
const publishedPackageObject = JSON.parse(packageString)

// if package.json has no posinstall script we either
// 1) have nothing to do
// 2) already have deleted it during prepublish but npm publish failed
// so we should just keep package.json and cached verison untouched
if (publishedPackageObject.scripts.postinstall) {
  writeFileSync(PACKAGE_CACHED_PATH, packageString)
  delete publishedPackageObject.scripts.postinstall
  writeFileSync(PACKAGE_PATH, JSON.stringify(publishedPackageObject, null, "  "))
}
