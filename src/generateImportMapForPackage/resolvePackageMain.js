import { extname, basename } from "path"
import { stat } from "fs"
import { firstOperationMatching } from "@dmail/helper"
import {
  pathnameToOperatingSystemPath,
  pathnameToRelativePathname,
} from "@jsenv/operating-system-path"
import { pathnameToDirname } from "./pathnameToDirname.js"
import { hasScheme } from "./hasScheme.js"

export const resolvePackageMain = ({ packageData, packagePathname, logger }) => {
  if ("module" in packageData) {
    return resolveMainFile({
      packagePathname,
      logger,
      packageMainFieldName: "module",
      packageMainFieldValue: packageData.module,
    })
  }

  if ("jsnext:main" in packageData) {
    return resolveMainFile({
      packagePathname,
      logger,
      packageMainFieldName: "jsnext:main",
      packageMainFieldValue: packageData["jsnext:main"],
    })
  }

  if ("main" in packageData) {
    return resolveMainFile({
      packagePathname,
      logger,
      packageMainFieldName: "main",
      packageMainFieldValue: packageData.main,
    })
  }

  return resolveMainFile({
    packagePathname,
    logger,
    packageMainFieldName: "default",
    packageMainFieldValue: "index",
  })
}

const extensionCandidateArray = ["js", "json", "node"]

const resolveMainFile = async ({
  packagePathname,
  logger,
  packageMainFieldName,
  packageMainFieldValue,
}) => {
  // main is explicitely empty meaning
  // it is assumed that we should not find a file
  if (packageMainFieldValue === "") {
    return null
  }

  if (
    hasScheme(packageMainFieldValue) ||
    packageMainFieldValue.startsWith("//") ||
    packageMainFieldValue.startsWith("../")
  ) {
    logger.warn(
      writePackageMainFieldMustBeInside({
        packagePathname,
        packageMainFieldName,
        packageMainFieldValue,
      }),
    )
    return null
  }

  let mainRelativePath
  if (packageMainFieldValue.slice(0, 2) === "./") {
    mainRelativePath = packageMainFieldValue.slice(1)
  } else if (packageMainFieldValue[0] === "/") {
    mainRelativePath = packageMainFieldValue
  } else {
    mainRelativePath = `/${packageMainFieldValue}`
  }

  if (packageMainFieldValue.endsWith("/")) {
    mainRelativePath += `index`
  }

  const packageDirname = pathnameToDirname(packagePathname)
  const mainFilePathnameFirstCandidate = `${packageDirname}${mainRelativePath}`
  const mainFilePathname = await findMainFilePathnameOrNull(mainFilePathnameFirstCandidate)

  if (mainFilePathname === null) {
    // we know in advance this remapping does not lead to an actual file.
    // we only warn because we have no guarantee this remapping will actually be used
    // in the codebase.
    logger.warn(
      writePackageMainFileNotFound({
        packagePathname,
        packageMainFieldName,
        packageMainFieldValue,
        mainFilePath: pathnameToOperatingSystemPath(mainFilePathnameFirstCandidate),
      }),
    )
    return `${mainRelativePath}.js`
  }

  return pathnameToRelativePathname(mainFilePathname, packageDirname)
}

const findMainFilePathnameOrNull = async (mainFilePathname) => {
  const mainFilePath = pathnameToOperatingSystemPath(mainFilePathname)
  const stats = await pathToStats(mainFilePath)

  if (stats === null) {
    const extension = extname(mainFilePathname)

    if (extension === "") {
      const extensionLeadingToAFile = await findExtension(mainFilePathname)
      if (extensionLeadingToAFile === null) {
        return null
      }
      return `${mainFilePathname}.${extensionLeadingToAFile}`
    }
    return null
  }

  if (stats.isFile()) {
    return mainFilePathname
  }

  if (stats.isDirectory()) {
    mainFilePathname += `index`
    const extensionLeadingToAFile = await findExtension(mainFilePathname)
    if (extensionLeadingToAFile === null) {
      return null
    }
    return `${mainFilePathname}.${extensionLeadingToAFile}`
  }

  return null
}

const findExtension = async (pathname) => {
  const dirname = pathnameToDirname(pathname)
  const filename = basename(pathname)
  const extensionLeadingToFile = await firstOperationMatching({
    array: extensionCandidateArray,
    start: async (extensionCandidate) => {
      const pathCandidate = pathnameToOperatingSystemPath(
        `${dirname}/${filename}.${extensionCandidate}`,
      )
      const stats = await pathToStats(pathCandidate)
      return stats && stats.isFile() ? extensionCandidate : null
    },
    predicate: (extension) => Boolean(extension),
  })
  return extensionLeadingToFile || null
}

const pathToStats = (path) => {
  return new Promise((resolve, reject) => {
    stat(path, (error, statObject) => {
      if (error) {
        if (error.code === "ENOENT") resolve(null)
        else reject(error)
      } else {
        resolve(statObject)
      }
    })
  })
}

const writePackageMainFieldMustBeInside = ({
  packagePathname,
  packageMainFieldName,
  packageMainFieldValue,
}) => `
${packageMainFieldName} field in package.json must be inside package.json folder.
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`

const writePackageMainFileNotFound = ({
  packagePathname,
  packageMainFieldName,
  packageMainFieldValue,
  mainFilePath,
}) => `
cannot find file for package.json ${packageMainFieldName} field
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- file path ---
${mainFilePath}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
--- extensions tried ---
${extensionCandidateArray.join(`,`)}
`
