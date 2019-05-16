import { pathnameToDirname } from "@jsenv/module-resolution"
import { firstOperationMatching } from "@dmail/helper"
import { readPackageData } from "./readPackageData.js"

export const resolveNodeModule = async ({
  rootFolderFilename,
  importerFilename,
  nodeModuleName,
}) => {
  const importerFolder = pathnameToDirname(importerFilename)
  const relativeFolder = importerFolder.slice(rootFolderFilename.length)
  const relativeFolderNameArray = relativeFolder
    .split("/")
    .filter((value) => value !== "node_modules")
  const nodeModuleCandidateArray = relativeFolderNameArray
    .map((_, index) => `${relativeFolderNameArray.slice(1, index + 1).join("/")}`)
    // reverse to handle deepest (most scoped) folder fist
    .reverse()

  return firstOperationMatching({
    array: nodeModuleCandidateArray,
    start: async (nodeModuleCandidate) => {
      const packageFilename = nodeModuleCandidate
        ? `${rootFolderFilename}/node_modules/${nodeModuleCandidate}/node_modules/${nodeModuleName}/package.json`
        : `${rootFolderFilename}/node_modules/${nodeModuleName}/package.json`

      const packageData = await readPackageData({
        filename: packageFilename,
        returnNullWhenNotFound: true,
      })

      return { packageData, packageFilename }
    },
    predicate: ({ packageData }) => Boolean(packageData),
  })
}
