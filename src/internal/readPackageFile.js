import { promisify } from "util"
import { readFile } from "fs"

export const readPackageFile = async (path) => {
  const packageFileString = await readFileContent(path)
  const packageJsonObject = JSON.parse(packageFileString)
  return packageJsonObject
}

const readFilePromisified = promisify(readFile)
const readFileContent = async (filePath) => {
  const buffer = await readFilePromisified(filePath)
  return buffer.toString()
}
