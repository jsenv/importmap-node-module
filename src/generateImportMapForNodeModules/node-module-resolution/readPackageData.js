import { fileRead } from "@dmail/helper"

export const readPackageData = async ({ path }) => {
  const packageString = await fileRead(path)
  const packageData = JSON.parse(packageString)
  return packageData
}
