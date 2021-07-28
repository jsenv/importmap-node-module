import { firstOperationMatching } from "@jsenv/cancellation"
import { urlToRelativeUrl, resolveUrl } from "@jsenv/util"

import { memoizeAsyncFunctionByUrl } from "../memoizeAsyncFunction.js"
import { readPackageFile, PACKAGE_NOT_FOUND, PACKAGE_WITH_SYNTAX_ERROR } from "./readPackageFile.js"

export const createFindNodeModulePackage = (packagesManualOverrides) => {
  const readPackageFileMemoized = memoizeAsyncFunctionByUrl((packageFileUrl) => {
    return readPackageFile(packageFileUrl, packagesManualOverrides)
  })

  return ({ projectDirectoryUrl, packageFileUrl, dependencyName }) => {
    const nodeModuleCandidates = getNodeModuleCandidates(packageFileUrl, projectDirectoryUrl)

    return firstOperationMatching({
      array: nodeModuleCandidates,
      start: async (nodeModuleCandidate) => {
        const packageFileUrlCandidate = `${projectDirectoryUrl}${nodeModuleCandidate}${dependencyName}/package.json`
        const packageObjectCandidate = await readPackageFileMemoized(packageFileUrlCandidate)
        return {
          packageFileUrl: packageFileUrlCandidate,
          packageJsonObject: packageObjectCandidate,
          syntaxError: packageObjectCandidate === PACKAGE_WITH_SYNTAX_ERROR,
        }
      },
      predicate: ({ packageJsonObject }) => {
        return packageJsonObject !== PACKAGE_NOT_FOUND
      },
    })
  }
}

const getNodeModuleCandidates = (fileUrl, projectDirectoryUrl) => {
  const fileDirectoryUrl = resolveUrl("./", fileUrl)

  if (fileDirectoryUrl === projectDirectoryUrl) {
    return [`node_modules/`]
  }

  const fileDirectoryRelativeUrl = urlToRelativeUrl(fileDirectoryUrl, projectDirectoryUrl)
  const candidates = []
  const relativeNodeModuleDirectoryArray = fileDirectoryRelativeUrl.split("node_modules/")
  // remove the first empty string
  relativeNodeModuleDirectoryArray.shift()

  let i = relativeNodeModuleDirectoryArray.length
  while (i--) {
    candidates.push(
      `node_modules/${relativeNodeModuleDirectoryArray
        .slice(0, i + 1)
        .join("node_modules/")}node_modules/`,
    )
  }

  return [...candidates, "node_modules/"]
}
