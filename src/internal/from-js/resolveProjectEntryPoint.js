import { createDetailedMessage } from "@jsenv/logger"
import {
  resolveUrl,
  readFile,
  readFileSystemNodeStat,
  urlToRelativeUrl,
} from "@jsenv/filesystem"

import { createPackageNameMustBeAStringWarning } from "../logs.js"
import { packageConditionsFromPackageUserConditions } from "../package_conditions.js"
import { visitPackageExports } from "../from-package/visitPackageExports.js"
import { resolvePackageMain } from "../from-package/resolvePackageMain.js"

const entryPointResolutionFailureMessage = `Cannot find project entry point`

export const resolveProjectEntryPoint = async ({
  projectDirectoryUrl,
  warn,
  packageUserConditions,
  runtime,
}) => {
  const packageConditions = packageConditionsFromPackageUserConditions({
    runtime,
    packageUserConditions,
  })

  const projectPackageFileUrl = resolveUrl(
    "./package.json",
    projectDirectoryUrl,
  )
  const projectPackageObject = await readFile(projectPackageFileUrl, {
    as: "json",
  })
  const projectPackageName = projectPackageObject.name
  if (typeof projectPackageName !== "string") {
    warn(
      createPackageNameMustBeAStringWarning({
        packageName: projectPackageName,
        packageFileUrl: projectPackageFileUrl,
      }),
    )
    return null
  }

  const projectPackageInfo = {
    name: projectPackageName,
    url: projectPackageFileUrl,
    object: projectPackageObject,
  }

  if ("exports" in projectPackageObject) {
    const packageExports = projectPackageObject.exports

    if (packageExports === false || packageExports === null) {
      warn({
        code: "PROJECT_ENTRY_POINT_RESOLUTION_FAILED",
        message: createDetailedMessage(entryPointResolutionFailureMessage, {
          reason: `explicitely disabled in package.json ("exports" is ${packageExports})`,
        }),
      })
      return null
    }

    if (typeof packageExports === "string") {
      return tryExportSubpath({
        warn,
        exportSubpath: packageExports,
        projectPackageFileUrl,
      })
    }

    const packageSubpaths = visitPackageExports({
      projectDirectoryUrl,
      warn,
      packageInfo: projectPackageInfo,
      packageExports,
      packageConditions,
    })
    const subpathKey = Object.keys(packageSubpaths).find(
      (from) => from === projectPackageName,
    )
    if (!subpathKey) {
      warn({
        code: "PROJECT_ENTRY_POINT_RESOLUTION_FAILED",
        message: createDetailedMessage(entryPointResolutionFailureMessage, {
          reason: `no subpath found in package.json "exports"`,
        }),
      })
      return null
    }
    return tryExportSubpath({
      warn,
      exportSubpath: packageSubpaths[subpathKey],
      projectPackageFileUrl,
    })
  }

  // visit "main" only if there is no "exports"
  // https://nodejs.org/docs/latest-v16.x/api/packages.html#packages_main
  const main = projectPackageObject.main
  if (main === "") {
    warn({
      code: "PROJECT_ENTRY_POINT_RESOLUTION_FAILED",
      message: createDetailedMessage(entryPointResolutionFailureMessage, {
        reason: `explicitely disabled in package.json ("main" is an empty string)`,
      }),
    })
    return null
  }

  const packageMainResolutionInfo = await resolvePackageMain({
    warn,
    packageInfo: projectPackageInfo,
  })
  if (!packageMainResolutionInfo.found) {
    warn({
      code: "PROJECT_ENTRY_POINT_RESOLUTION_FAILED",
      message: createDetailedMessage(entryPointResolutionFailureMessage, {
        reason: packageMainResolutionInfo.warning.message,
      }),
    })
    return null
  }

  return packageMainResolutionInfo.relativeUrl
}

const tryExportSubpath = async ({
  warn,
  exportSubpath,
  projectPackageFileUrl,
}) => {
  const subpathUrl = resolveUrl(exportSubpath, projectPackageFileUrl)
  const filesystemStat = await readFileSystemNodeStat(subpathUrl, {
    nullIfNotFound: true,
  })
  if (filesystemStat === null || !filesystemStat.isFile()) {
    warn({
      code: "PROJECT_ENTRY_POINT_RESOLUTION_FAILED",
      message: createDetailedMessage(entryPointResolutionFailureMessage, {
        reason: `file not found for "${exportSubpath}" declared in package.json "exports"`,
      }),
    })
    return null
  }
  return urlToRelativeUrl(subpathUrl, projectPackageFileUrl)
}
