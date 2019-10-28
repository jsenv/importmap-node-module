import { fileURLToPath } from "url"
import { firstOperationMatching } from "@dmail/helper"
import { fileUrlToRelativePath, fileUrlToDirectoryUrl } from "../urlHelpers.js"
import { readPackageFile } from "./readPackageFile.js"

export const resolveNodeModule = async ({
  logger,
  rootProjectDirectoryUrl,
  packageFileUrl,
  packageJsonObject,
  dependencyName,
  dependencyVersionPattern,
  dependencyType,
}) => {
  const packageDirectoryUrl = fileUrlToDirectoryUrl(packageFileUrl)
  const nodeModuleCandidateArray = [
    ...computeNodeModuleCandidateArray(packageDirectoryUrl, rootProjectDirectoryUrl),
    `node_modules/`,
  ]

  const result = await firstOperationMatching({
    array: nodeModuleCandidateArray,
    start: async (nodeModuleCandidate) => {
      const packageFileUrl = `${rootProjectDirectoryUrl}${nodeModuleCandidate}${dependencyName}/package.json`
      const packageFilePath = fileURLToPath(packageFileUrl)
      try {
        const packageJsonObject = await readPackageFile(packageFilePath)
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
${packageFilePath}
`)
          return {}
        }

        throw e
      }
    },
    predicate: ({ packageJsonObject }) => Boolean(packageJsonObject),
  })

  if (!result) {
    logger.warn(`
cannot find a ${dependencyType}.
--- ${dependencyType} ---
${dependencyName}@${dependencyVersionPattern}
--- required by ---
${packageJsonObject.name}@${packageJsonObject.version}
--- package.json path ---
${fileURLToPath(packageFileUrl)}
    `)
  }

  return result
}

const computeNodeModuleCandidateArray = (packageDirectoryUrl, rootProjectDirectoryUrl) => {
  if (packageDirectoryUrl === rootProjectDirectoryUrl) {
    return []
  }

  const packageDirectoryRelativePath = fileUrlToRelativePath(
    packageDirectoryUrl,
    rootProjectDirectoryUrl,
  )

  const candidateArray = []
  const relativeNodeModuleDirectoryArray = packageDirectoryRelativePath.split("/node_modules/")
  // remove the first empty string
  relativeNodeModuleDirectoryArray.shift()

  let i = relativeNodeModuleDirectoryArray.length
  while (i--) {
    candidateArray.push(
      `node_modules/${relativeNodeModuleDirectoryArray
        .slice(0, i + 1)
        .join("/node_modules/")}node_modules/`,
    )
  }

  return candidateArray
}
