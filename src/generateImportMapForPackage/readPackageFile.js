import { fileRead } from "@dmail/helper"

export const readPackageFile = async (path) => {
  const packageFileString = await fileRead(path)
  const packageJsonObject = JSON.parse(packageFileString)
  return packageJsonObject
}
