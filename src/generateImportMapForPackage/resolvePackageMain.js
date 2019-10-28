import { dirname, extname, basename } from "path"
import { stat } from "fs"
import { firstOperationMatching } from "@dmail/helper"
import { resolveFileUrl, fileUrlToDirectoryUrl, fileUrlToPath } from "./urlHelpers.js"
import { fileURLToPath } from "url"

export const resolvePackageMain = ({ logger, packageFileUrl, packageJsonObject }) => {
  if ("module" in packageJsonObject) {
    return resolveMainFile({
      logger,
      packageFileUrl,
      packageMainFieldName: "module",
      packageMainFieldValue: packageJsonObject.module,
    })
  }

  if ("jsnext:main" in packageJsonObject) {
    return resolveMainFile({
      logger,
      packageFileUrl,
      packageMainFieldName: "jsnext:main",
      packageMainFieldValue: packageJsonObject["jsnext:main"],
    })
  }

  if ("main" in packageJsonObject) {
    return resolveMainFile({
      logger,
      packageFileUrl,
      packageMainFieldName: "main",
      packageMainFieldValue: packageJsonObject.main,
    })
  }

  return resolveMainFile({
    logger,
    packageFileUrl,
    packageMainFieldName: "default",
    packageMainFieldValue: "index",
  })
}

const extensionCandidateArray = ["js", "json", "node"]

const resolveMainFile = async ({
  logger,
  packageFileUrl,
  packageMainFieldName,
  packageMainFieldValue,
}) => {
  // main is explicitely empty meaning
  // it is assumed that we should not find a file
  if (packageMainFieldValue === "") {
    return null
  }

  const packageFilePath = fileUrlToPath(packageFileUrl)
  const packageDirectoryUrl = fileUrlToDirectoryUrl(packageFileUrl)
  const mainFileRelativePath = packageMainFieldValue.endsWith("/")
    ? `${packageMainFieldValue}index`
    : packageMainFieldValue

  const mainFileUrlFirstCandidate = resolveFileUrl(mainFileRelativePath, packageFileUrl)

  if (!mainFileUrlFirstCandidate.startsWith(packageDirectoryUrl)) {
    logger.warn(
      `
${packageMainFieldName} field in package.json must be inside package.json folder.
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- package.json path ---
${packageFilePath}
`,
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
        `
cannot find file for package.json ${packageMainFieldName} field
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- file path ---
${fileURLToPath(mainFileUrlFirstCandidate)}
--- package.json path ---
${packageFilePath}
--- extensions tried ---
${extensionCandidateArray.join(`,`)}
        `,
      )
    }
    return mainFileUrlFirstCandidate
  }

  return mainFileUrl
}

const findMainFileUrlOrNull = async (mainFileUrl) => {
  const mainFilePath = fileUrlToPath(mainFileUrl)
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
