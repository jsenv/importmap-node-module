import {
  pathnameToOperatingSystemPath,
  pathnameToRelativePathname,
} from "@jsenv/operating-system-path"
import { firstOperationMatching } from "@dmail/helper"
import { pathnameToDirname } from "../pathnameToDirname.js"
import { readPackageData } from "./readPackageData.js"

export const resolveNodeModule = async ({
  rootPathname,
  packagePathname,
  packageData,
  dependencyName,
  dependencyVersionPattern,
  dependencyType,
  onWarn,
}) => {
  const packageFolderPathname = pathnameToDirname(packagePathname)
  const packageFolderRelativePath = pathnameToRelativePathname(packageFolderPathname, rootPathname)

  const nodeModuleCandidateArray = [
    ...getCandidateArrayFromPackageFolder(packageFolderRelativePath),
    `node_modules`,
  ]

  const result = await firstOperationMatching({
    array: nodeModuleCandidateArray,
    start: async (nodeModuleCandidate) => {
      const packagePathname = `${rootPathname}/${nodeModuleCandidate}/${dependencyName}/package.json`
      try {
        const packageData = await readPackageData({
          path: pathnameToOperatingSystemPath(packagePathname),
        })
        return { packagePathname, packageData }
      } catch (e) {
        if (e.code === "ENOENT") {
          return {}
        }

        if (e.name === "SyntaxError") {
          throw createDependencyPackageParsingError({
            parsingError: e,
            packagePathname,
          })
        }

        throw e
      }
    },
    predicate: ({ packageData }) => Boolean(packageData),
  })

  if (!result) {
    onWarn({
      code: "DEPENDENCY_NOT_FOUND",
      message: createDendencyNotFoundMessage({
        dependencyName,
        dependencyType,
        dependencyVersionPattern,
        packagePathname,
        packageData,
      }),
      data: { packagePathname, packageData, dependencyName, dependencyType },
    })
  }

  return result
}

const getCandidateArrayFromPackageFolder = (packageFolderRelativePath) => {
  if (packageFolderRelativePath === "") return []

  const candidateArray = []
  const relativeFolderNameArray = packageFolderRelativePath.split("/node_modules/")
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

const createDependencyPackageParsingError = ({ parsingError, packagePathname }) =>
  new SyntaxError(`error while parsing dependency package.json.
--- parsing error message ---
${parsingError.message}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`)

const createDendencyNotFoundMessage = ({
  dependencyName,
  dependencyType,
  dependencyVersionPattern,
  packageData,
  packagePathname,
}) => `cannot find a ${dependencyType}.
--- ${dependencyType} ---
${dependencyName}@${dependencyVersionPattern}
--- required by ---
${packageData.name}@${packageData.version}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`
