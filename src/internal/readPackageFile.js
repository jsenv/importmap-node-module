import { readFile } from "@jsenv/util"
import { applyPackageManualOverride } from "./applyPackageManualOverride.js"

export const readPackageFile = async (packageFileUrl, packagesManualOverrides) => {
  const packageFileString = await readFile(packageFileUrl)
  const packageJsonObject = JSON.parse(packageFileString)
  return applyPackageManualOverride(packageJsonObject, packagesManualOverrides)
}
