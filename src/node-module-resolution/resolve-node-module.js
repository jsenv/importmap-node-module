import {
  pathnameToOperatingSystemPath,
  pathnameToRelativePathname,
} from "@jsenv/operating-system-path"
import { pathnameToDirname } from "@jsenv/module-resolution"
import { firstOperationMatching } from "@dmail/helper"
import { readPackageData } from "./read-package-data.js"

export const resolveNodeModule = async ({ rootPathname, importerPathname, nodeModuleName }) => {
  const importerFolderPathname = pathnameToDirname(importerPathname)
  const importerFolderRelativePath = pathnameToRelativePathname(
    importerFolderPathname,
    rootPathname,
  )
  const relativeFolderNameArray = importerFolderRelativePath
    .split("/")
    .filter((value) => value !== "node_modules")
  const nodeModuleCandidateArray = relativeFolderNameArray
    .map((_, index) => `${relativeFolderNameArray.slice(1, index + 1).join("/")}`)
    // reverse to handle deepest (most scoped) folder fist
    .reverse()

  return firstOperationMatching({
    array: nodeModuleCandidateArray,
    start: async (nodeModuleCandidate) => {
      const packagePathname = nodeModuleCandidate
        ? `${rootPathname}/node_modules/${nodeModuleCandidate}/node_modules/${nodeModuleName}/package.json`
        : `${rootPathname}/node_modules/${nodeModuleName}/package.json`

      const packageData = await readPackageData({
        filename: pathnameToOperatingSystemPath(packagePathname),
        returnNullWhenNotFound: true,
      })

      return { packagePathname, packageData }
    },
    predicate: ({ packageData }) => Boolean(packageData),
  })
}
