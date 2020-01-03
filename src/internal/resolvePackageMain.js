import { dirname, extname, basename } from "path"
import { firstOperationMatching } from "@jsenv/cancellation"
import { resolveUrl, urlToFileSystemPath, readFileStat } from "@jsenv/util"
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

  const packageFilePath = urlToFileSystemPath(packageFileUrl)
  const packageDirectoryUrl = resolveUrl("./", packageFileUrl)
  const mainFileRelativeUrl = packageMainFieldValue.endsWith("/")
    ? `${packageMainFieldValue}index`
    : packageMainFieldValue

  const mainFileUrlFirstCandidate = resolveUrl(mainFileRelativeUrl, packageFileUrl)

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
  const stats = await readFileStat(mainFileUrl)

  if (stats === null) {
    const mainFilePath = urlToFileSystemPath(mainFileUrl)
    const extension = extname(mainFilePath)

    if (extension === "") {
      const extensionLeadingToAFile = await findExtension(mainFileUrl)
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
    const indexFileUrl = resolveUrl(
      "./index",
      mainFileUrl.endsWith("/") ? mainFileUrl : `${mainFileUrl}/`,
    )
    const extensionLeadingToAFile = await findExtension(indexFileUrl)
    if (extensionLeadingToAFile === null) {
      return null
    }
    return `${indexFileUrl}.${extensionLeadingToAFile}`
  }

  return null
}

const findExtension = async (fileUrl) => {
  const filePath = urlToFileSystemPath(fileUrl)
  const fileDirname = dirname(filePath)
  const fileBasename = basename(filePath)
  const extensionLeadingToFile = await firstOperationMatching({
    array: extensionCandidateArray,
    start: async (extensionCandidate) => {
      const filePathCandidate = `${fileDirname}/${fileBasename}.${extensionCandidate}`
      const stats = await readFileStat(filePathCandidate)
      return stats && stats.isFile() ? extensionCandidate : null
    },
    predicate: (extension) => Boolean(extension),
  })
  return extensionLeadingToFile || null
}
