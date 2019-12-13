import { promisify } from "util"
import { readFile } from "fs"

export const readPackageFile = async (path, manualOverrides) => {
  const packageFileString = await readFileContent(path)
  const packageJsonObject = JSON.parse(packageFileString)
  const { name, version } = packageJsonObject

  const overrideKey = Object.keys(manualOverrides).find((overrideKeyCandidate) => {
    if (name === overrideKeyCandidate) return true
    if (`${name}@${version}` === overrideKeyCandidate) return true
    return false
  })
  if (overrideKey) {
    return composeObject(packageJsonObject, manualOverrides[overrideKey])
  }
  return packageJsonObject
}

const composeObject = (leftObject, rightObject) => {
  const composedObject = {
    ...leftObject,
  }
  Object.keys(rightObject).forEach((key) => {
    const rightValue = rightObject[key]

    if (rightValue === null || typeof rightValue !== "object" || key in leftObject === false) {
      composedObject[key] = rightValue
    } else {
      const leftValue = leftObject[key]
      if (leftValue === null || typeof leftValue !== "object") {
        composedObject[key] = rightValue
      } else {
        composedObject[key] = composeObject(leftValue, rightValue)
      }
    }
  })
  return composedObject
}

const readFilePromisified = promisify(readFile)
const readFileContent = async (filePath) => {
  const buffer = await readFilePromisified(filePath)
  return buffer.toString()
}
