import { readFileSync, writeFileSync } from "node:fs"

const PACKAGE_URL = new URL("../../package.json", import.meta.url)
const PACKAGE_CACHED_URL = new URL("../../package-cached.json", import.meta.url)
const packageString = String(readFileSync(PACKAGE_URL))
const publishedPackageObject = JSON.parse(packageString)

// if package.json has no posinstall script we either
// 1) have nothing to do
// 2) already have deleted it during prepublish but npm publish failed
// so we should just keep package.json and cached verison untouched
if (publishedPackageObject.scripts.postinstall) {
  writeFileSync(PACKAGE_CACHED_URL, packageString)
  delete publishedPackageObject.scripts.postinstall
  writeFileSync(PACKAGE_URL, JSON.stringify(publishedPackageObject, null, "  "))
}
