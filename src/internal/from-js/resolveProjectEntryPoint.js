import {
  resolveUrl,
  readFile,
  readFileSystemNodeStat,
  urlToRelativeUrl,
} from "@jsenv/filesystem"

import {
  createPackageNameMustBeAStringWarning,
  createProjectEntryPointResolutionFailedWarning,
} from "../logs.js"
import { packageConditionsFromPackageUserConditions } from "../package_conditions.js"
import { visitPackageExports } from "../from-package/visitPackageExports.js"
import { resolvePackageMain } from "../from-package/resolvePackageMain.js"

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
      warn(
        createProjectEntryPointResolutionFailedWarning({
          cause: "EXPORTS_IS_FALSE_OR_NULL",
          projectPackageInfo,
        }),
      )
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
    const subpathKey = Object.keys(packageSubpaths).find((from) => from === ".")
    if (!subpathKey) {
      warn(
        createProjectEntryPointResolutionFailedWarning({
          cause: "EXPORT_SUBPATH_NOT_FOUND",
          projectPackageInfo,
        }),
      )
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
    warn(
      createProjectEntryPointResolutionFailedWarning({
        cause: "MAIN_IS_EMPTY_STRING",
        projectPackageInfo,
      }),
    )
    return null
  }

  const packageMainRelativeUrl = await resolvePackageMain({
    warn,
    packageInfo: projectPackageInfo,
  })
  if (!packageMainRelativeUrl) {
    warn(
      createProjectEntryPointResolutionFailedWarning({
        cause: "MAIN_FILE_NOT_FOUND",
        projectPackageInfo,
      }),
    )
    return null
  }

  return packageMainRelativeUrl
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
    warn(
      createProjectEntryPointResolutionFailedWarning({
        cause: "EXPORT_SUBPATH_FILE_NOT_FOUND",
        exportSubpath,
      }),
    )
    return null
  }
  return urlToRelativeUrl(subpathUrl, projectPackageFileUrl)
}
