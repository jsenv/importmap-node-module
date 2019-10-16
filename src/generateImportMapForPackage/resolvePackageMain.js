import { extname } from "path"
import { stat } from "fs"
import { firstOperationMatching } from "@dmail/helper"
import { pathnameToOperatingSystemPath } from "@jsenv/operating-system-path"
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

  const packageDirname = pathnameToDirname(packagePathname)
  const mainFilePath = pathnameToOperatingSystemPath(`${packageDirname}/${mainRelativePath}`)
  const extension = extname(mainFilePath)

  if (extension === "") {
    const extensionLeadingToFile = await firstOperationMatching({
      array: extensionCandidateArray,
      start: async (extensionCandidate) => {
        const pathCandidate = pathnameToOperatingSystemPath(
          `${packageDirname}${mainRelativePath}.${extensionCandidate}`,
        )
        const isFile = await pathLeadsToAFile(pathCandidate)
        return isFile ? extensionCandidate : null
      },
      predicate: (extension) => Boolean(extension),
    })
    if (extensionLeadingToFile) {
      return `${mainRelativePath}.${extensionLeadingToFile}`
    }

    // we know in advance this remapping does not lead to an actual file.
    // we only warn because we have no guarantee this remapping will actually be used
    // in the codebase.
    logger.warn(
      writePackageMainFileNotFound({
        packagePathname,
        packageMainFieldName,
        packageMainFieldValue,
        mainFilePath,
      }),
    )

    return `${mainRelativePath}.js`
  }

  const isFile = await pathLeadsToAFile(mainFilePath)
  if (!isFile) {
    logger.warn(
      writePackageMainFileNotFound({
        packagePathname,
        packageMainFieldName,
        packageMainFieldValue,
        mainFilePath,
      }),
    )
  }

  return mainRelativePath
}

const pathLeadsToAFile = (path) => {
  return new Promise((resolve, reject) => {
    stat(path, (error, statObject) => {
      if (error) {
        if (error.code === "ENOENT") resolve(false)
        else reject(error)
      } else {
        resolve(statObject.isFile())
      }
    })
  })
}

const writePackageMainFieldMustBeInside = ({
  packagePathname,
  packageMainFieldName,
  packageMainFieldValue,
}) => `${packageMainFieldName} field in package.json must be inside package.json folder.
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}`

const writePackageMainFileNotFound = ({
  packagePathname,
  packageMainFieldName,
  packageMainFieldValue,
  mainFilePath,
}) => `cannot find file for package.json ${packageMainFieldName} field
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- file path ---
${mainFilePath}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
--- extensions tried ---
${extensionCandidateArray.join(`,`)}`
