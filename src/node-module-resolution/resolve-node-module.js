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

  const nodeModuleCandidateArray = [
    ...getCandidateArrayFromImporter(importerFolderRelativePath),
    `node_modules`,
  ]

  return firstOperationMatching({
    array: nodeModuleCandidateArray,
    start: async (nodeModuleCandidate) => {
      const packagePathname = `${rootPathname}/${nodeModuleCandidate}/${nodeModuleName}/package.json`
      const packageData = await readPackageData({
        path: pathnameToOperatingSystemPath(packagePathname),
        returnNullWhenNotFound: true,
      })

      return { packagePathname, packageData }
    },
    predicate: ({ packageData }) => Boolean(packageData),
  })
}

const getCandidateArrayFromImporter = (importerRelativePath) => {
  if (importerRelativePath === "") return []

  const candidateArray = []
  const relativeFolderNameArray = importerRelativePath.split("/node_modules/")
  // remove the first empty string
  relativeFolderNameArray.shift()

  let i = relativeFolderNameArray.length
  while (i--) {
    candidateArray.push(
      `node_modules/${relativeFolderNameArray.slice(0, i + 1).join("/node_modules/")}/node_modules`,
    )
  }

  return candidateArray
}
