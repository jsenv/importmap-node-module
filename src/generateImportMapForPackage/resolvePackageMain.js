import { fileURLToPath } from "url"
import { dirname, extname, basename } from "path"
import { stat } from "fs"
import { firstOperationMatching } from "@dmail/helper"
import { resolveDirectoryUrl } from "./resolveDirectoryUrl.js"
import { resolveFileUrl } from "./resolveFileUrl.js"

export const resolvePackageMain = ({ packageData, packageFileUrl, logger }) => {
  if ("module" in packageData) {
    return resolveMainFile({
      packageFileUrl,
      logger,
      packageMainFieldName: "module",
      packageMainFieldValue: packageData.module,
    })
  }

  if ("jsnext:main" in packageData) {
    return resolveMainFile({
      packageFileUrl,
      logger,
      packageMainFieldName: "jsnext:main",
      packageMainFieldValue: packageData["jsnext:main"],
    })
  }

  if ("main" in packageData) {
    return resolveMainFile({
      packageFileUrl,
      logger,
      packageMainFieldName: "main",
      packageMainFieldValue: packageData.main,
    })
  }

  return resolveMainFile({
    packageFileUrl,
    logger,
    packageMainFieldName: "default",
    packageMainFieldValue: "index",
  })
}

const extensionCandidateArray = ["js", "json", "node"]

const resolveMainFile = async ({
  packageFileUrl,
  logger,
  packageMainFieldName,
  packageMainFieldValue,
}) => {
  // main is explicitely empty meaning
  // it is assumed that we should not find a file
  if (packageMainFieldValue === "") {
    return null
  }

  const packageFilePath = fileURLToPath(packageFileUrl)
  const packageDirectoryUrl = resolveDirectoryUrl("./", packageFileUrl)
  const mainFileRelativePath = packageMainFieldValue.endsWith("/")
    ? `${packageMainFieldValue}index`
    : packageMainFieldValue

  const mainFileUrlFirstCandidate = resolveFileUrl(mainFileRelativePath, packageFileUrl)

  if (!mainFileUrlFirstCandidate.startsWith(packageDirectoryUrl)) {
    logger.warn(
      writePackageMainFieldMustBeInside({
        packageFilePath,
        packageMainFieldName,
        packageMainFieldValue,
      }),
    )
    return null
  }

  const mainFileUrl = await findMainFileUrlOrNull(mainFileUrlFirstCandidate)

  if (mainFileUrl === null) {
    // we know in advance this remapping does not lead to an actual file.
    // we only warn because we have no guarantee this remapping will actually be used
    // in the codebase.

    // warn only if there is actually a main field
    // otherwise the package.json is missing the main field
    // it certainly means it's not important
    if (packageMainFieldName !== "default") {
      logger.warn(
        writePackageMainFileNotFound({
          packageFilePath: fileURLToPath(packageFileUrl),
          packageMainFieldName,
          packageMainFieldValue,
          mainFilePath: fileURLToPath(mainFileUrlFirstCandidate),
        }),
      )
    }
    return mainFileUrlFirstCandidate
  }

  return mainFileUrl
}

const findMainFileUrlOrNull = async (mainFileUrl) => {
  const mainFilePath = fileURLToPath(mainFileUrl)
  const stats = await pathToStats(mainFilePath)

  if (stats === null) {
    const extension = extname(mainFilePath)

    if (extension === "") {
      const extensionLeadingToAFile = await findExtension(mainFilePath)
      if (extensionLeadingToAFile === null) {
        return null
      }
      return `${mainFileUrl}.${extensionLeadingToAFile}`
    }
    return null
  }

  if (stats.isFile()) {
    return mainFileUrl
  }

  if (stats.isDirectory()) {
    const indexFileUrl = `${mainFileUrl}${mainFileUrl.endsWith("/") ? `index` : `/index`}`
    const extensionLeadingToAFile = await findExtension(indexFileUrl)
    if (extensionLeadingToAFile === null) {
      return null
    }
    return `${indexFileUrl}.${extensionLeadingToAFile}`
  }

  return null
}

const findExtension = async (path) => {
  const pathDirname = dirname(path)
  const pathBasename = basename(path)
  const extensionLeadingToFile = await firstOperationMatching({
    array: extensionCandidateArray,
    start: async (extensionCandidate) => {
      const pathCandidate = `${pathDirname}/${pathBasename}.${extensionCandidate}`
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
  packageFilePath,
  packageMainFieldName,
  packageMainFieldValue,
}) => `
${packageMainFieldName} field in package.json must be inside package.json folder.
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- package.json path ---
${packageFilePath}
`

const writePackageMainFileNotFound = ({
  packageFilePath,
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
${packageFilePath}
--- extensions tried ---
${extensionCandidateArray.join(`,`)}
`
