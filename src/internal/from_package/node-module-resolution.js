import { firstOperationMatching } from "@jsenv/cancellation"
import {
  urlToRelativeUrl,
  resolveUrl,
  urlToParentUrl,
  ensureWindowsDriveLetter,
} from "@jsenv/filesystem"

import { memoizeAsyncFunctionByUrl } from "../memoizeAsyncFunction.js"
import {
  readPackageFile,
  PACKAGE_NOT_FOUND,
  PACKAGE_WITH_SYNTAX_ERROR,
} from "./readPackageFile.js"
import { applyPackageManualOverride } from "./applyPackageManualOverride.js"

export const createFindNodeModulePackage = () => {
  const readPackageFileMemoized = memoizeAsyncFunctionByUrl(
    (packageFileUrl) => {
      return readPackageFile(packageFileUrl)
    },
  )
  return ({
    projectDirectoryUrl,
    nodeModulesOutsideProjectAllowed,
    packagesManualOverrides = {},
    packageFileUrl,
    dependencyName,
  }) => {
    const nodeModuleCandidates = [
      ...getNodeModuleCandidatesInsideProject({
        projectDirectoryUrl,
        packageFileUrl,
      }),
      ...(nodeModulesOutsideProjectAllowed
        ? getNodeModuleCandidatesOutsideProject({
            projectDirectoryUrl,
          })
        : []),
    ]
    return firstOperationMatching({
      array: nodeModuleCandidates,
      start: async (nodeModuleCandidate) => {
        const packageFileUrlCandidate = `${nodeModuleCandidate}${dependencyName}/package.json`
        const packageObjectCandidate = await readPackageFileMemoized(
          packageFileUrlCandidate,
        )
        return {
          packageFileUrl: packageFileUrlCandidate,
          packageJsonObject: applyPackageManualOverride(
            packageObjectCandidate,
            packagesManualOverrides,
          ),
          syntaxError: packageObjectCandidate === PACKAGE_WITH_SYNTAX_ERROR,
        }
      },
      predicate: ({ packageJsonObject }) => {
        return packageJsonObject !== PACKAGE_NOT_FOUND
      },
    })
  }
}

const getNodeModuleCandidatesInsideProject = ({
  projectDirectoryUrl,
  packageFileUrl,
}) => {
  const packageDirectoryUrl = resolveUrl("./", packageFileUrl)
  if (packageDirectoryUrl === projectDirectoryUrl) {
    return [`${projectDirectoryUrl}node_modules/`]
  }
  const packageDirectoryRelativeUrl = urlToRelativeUrl(
    packageDirectoryUrl,
    projectDirectoryUrl,
  )
  const candidates = []
  const relativeNodeModuleDirectoryArray =
    packageDirectoryRelativeUrl.split("node_modules/")
  // remove the first empty string
  relativeNodeModuleDirectoryArray.shift()
  let i = relativeNodeModuleDirectoryArray.length
  while (i--) {
    candidates.push(
      `${projectDirectoryUrl}node_modules/${relativeNodeModuleDirectoryArray
        .slice(0, i + 1)
        .join("node_modules/")}node_modules/`,
    )
  }
  return [...candidates, `${projectDirectoryUrl}node_modules/`]
}

const getNodeModuleCandidatesOutsideProject = ({ projectDirectoryUrl }) => {
  const candidates = []
  const parentDirectoryUrl = urlToParentUrl(projectDirectoryUrl)
  const { pathname } = new URL(parentDirectoryUrl)
  const directories = pathname.slice(1, -1).split("/")
  let i = directories.length
  while (i--) {
    const nodeModulesDirectoryUrl = ensureWindowsDriveLetter(
      `file:///${directories.slice(0, i + 1).join("/")}/node_modules/`,
      projectDirectoryUrl,
    )
    candidates.push(nodeModulesDirectoryUrl)
  }
  return [
    ...candidates,
    ensureWindowsDriveLetter(`file:///node_modules`, projectDirectoryUrl),
  ]
}
