import { firstOperationMatching } from "@jsenv/cancellation"
import { urlToRelativeUrl, resolveUrl, urlToFileSystemPath } from "@jsenv/util"
import { readPackageFile } from "./readPackageFile.js"

export const resolveNodeModule = async ({
  logger,
  rootProjectDirectoryUrl,
  packagesManualOverrides,
  packageFileUrl,
  dependencyName,
}) => {
  const packageDirectoryUrl = resolveUrl("./", packageFileUrl)
  const nodeModuleCandidateArray = [
    ...computeNodeModuleCandidateArray(packageDirectoryUrl, rootProjectDirectoryUrl),
    `node_modules/`,
  ]

  return firstOperationMatching({
    array: nodeModuleCandidateArray,
    start: async (nodeModuleCandidate) => {
      const packageFileUrl = `${rootProjectDirectoryUrl}${nodeModuleCandidate}${dependencyName}/package.json`
      try {
        const packageJsonObject = await readPackageFile(packageFileUrl, packagesManualOverrides)
        return {
          packageFileUrl,
          packageJsonObject,
        }
      } catch (e) {
        if (e.code === "ENOENT") {
          return {}
        }

        if (e.name === "SyntaxError") {
          logger.error(`
error while parsing dependency package.json.
--- parsing error message ---
${e.message}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}
`)
          return {}
        }

        throw e
      }
    },
    predicate: ({ packageJsonObject }) => Boolean(packageJsonObject),
  })
}

const computeNodeModuleCandidateArray = (packageDirectoryUrl, rootProjectDirectoryUrl) => {
  if (packageDirectoryUrl === rootProjectDirectoryUrl) {
    return []
  }

  const packageDirectoryRelativeUrl = urlToRelativeUrl(packageDirectoryUrl, rootProjectDirectoryUrl)

  const candidateArray = []
  const relativeNodeModuleDirectoryArray = packageDirectoryRelativeUrl.split("node_modules/")
  // remove the first empty string
  relativeNodeModuleDirectoryArray.shift()

  let i = relativeNodeModuleDirectoryArray.length
  while (i--) {
    candidateArray.push(
      `node_modules/${relativeNodeModuleDirectoryArray
        .slice(0, i + 1)
        .join("node_modules/")}node_modules/`,
    )
  }

  return candidateArray
}
