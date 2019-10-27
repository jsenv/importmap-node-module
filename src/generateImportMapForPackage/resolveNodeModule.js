import { fileURLToPath } from "url"
import { firstOperationMatching } from "@dmail/helper"
import { readPackageData } from "./readPackageData.js"
import { resolveDirectoryUrl } from "./resolveDirectoryUrl.js"

export const resolveNodeModule = async ({
  rootProjectDirectoryUrl,
  packageFileUrl,
  packageData,
  dependencyName,
  dependencyVersionPattern,
  dependencyType,
  logger,
}) => {
  const packageDirectoryUrl = resolveDirectoryUrl("./", packageFileUrl)
  const packageDirectoryRelativePath = packageDirectoryUrl.slice(rootProjectDirectoryUrl.length)

  const nodeModuleCandidateArray = [
    ...computeNodeModuleCandidateArray(packageDirectoryRelativePath),
    `node_modules/`,
  ]

  const result = await firstOperationMatching({
    array: nodeModuleCandidateArray,
    start: async (nodeModuleCandidate) => {
      const packageFileUrl = `${rootProjectDirectoryUrl}${nodeModuleCandidate}${dependencyName}/package.json`
      const packageFilePath = fileURLToPath(packageFileUrl)
      try {
        const packageData = await readPackageData({
          path: packageFilePath,
        })
        return {
          packageFileUrl,
          packageData,
        }
      } catch (e) {
        if (e.code === "ENOENT") {
          return {}
        }

        if (e.name === "SyntaxError") {
          logger.error(
            writeDependencyPackageParsingError({
              parsingError: e,
              packageFilePath,
            }),
          )
          return {}
        }

        throw e
      }
    },
    predicate: ({ packageData }) => Boolean(packageData),
  })

  if (!result) {
    logger.warn(
      writeDendencyNotFound({
        dependencyName,
        dependencyType,
        dependencyVersionPattern,
        packageFilePath: fileURLToPath(packageFileUrl),
        packageData,
      }),
    )
  }

  return result
}

const computeNodeModuleCandidateArray = (packageDirectoryRelativePath) => {
  if (packageDirectoryRelativePath === "") return []

  const candidateArray = []
  const relativeNodeModuleDirectoryArray = packageDirectoryRelativePath.split("/node_modules/")
  // remove the first empty string
  relativeNodeModuleDirectoryArray.shift()

  let i = relativeNodeModuleDirectoryArray.length
  while (i--) {
    candidateArray.push(
      `node_modules/${relativeNodeModuleDirectoryArray
        .slice(0, i + 1)
        .join("/node_modules/")}/node_modules/`,
    )
  }

  return candidateArray
}

const writeDependencyPackageParsingError = ({ parsingError, packageFilePath }) => `
error while parsing dependency package.json.
--- parsing error message ---
${parsingError.message}
--- package.json path ---
${packageFilePath}
`

const writeDendencyNotFound = ({
  dependencyName,
  dependencyType,
  dependencyVersionPattern,
  packageData,
  packageFilePath,
}) => `
cannot find a ${dependencyType}.
--- ${dependencyType} ---
${dependencyName}@${dependencyVersionPattern}
--- required by ---
${packageData.name}@${packageData.version}
--- package.json path ---
${packageFilePath}
`
