import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs"

const PACKAGE_URL = new URL("../../package.json", import.meta.url)
const PACKAGE_CACHED_URL = new URL("../../package-cached.json", import.meta.url)

if (existsSync(PACKAGE_CACHED_URL)) {
  // we could also use move right ?
  writeFileSync(PACKAGE_URL, readFileSync(PACKAGE_CACHED_URL))
  unlinkSync(PACKAGE_CACHED_URL)
}
