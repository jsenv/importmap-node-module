import { resolveUrl, readFile } from "@jsenv/filesystem"

import { createPackageNameMustBeAStringWarning } from "../logs.js"
import { packageConditionsFromPackageUserConditions } from "../package_conditions.js"
import { visitPackageExports } from "../from-package/visitPackageExports.js"
import { resolvePackageMain } from "../from-package/resolvePackageMain.js"

export const resolveProjectMainFile = async ({
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
    const packageExports = visitPackageExports({
      projectDirectoryUrl,
      warn,
      packageInfo: projectPackageInfo,
      packageConditions,
    })
    const mainExport = Object.keys(packageExports).find((from) => {
      return from === "."
    })

    if (!mainExport) {
      // todo: warn
      return null
    }

    return mainExport
  }

  // visit "main" only if there is no "exports"
  // https://nodejs.org/docs/latest-v16.x/api/packages.html#packages_main
  const packageMainFile = await resolvePackageMain({
    warn,
    packageInfo: projectPackageInfo,
  })
  if (!packageMainFile) {
    // todo: warn
    return null
  }

  return packageMainFile
}
