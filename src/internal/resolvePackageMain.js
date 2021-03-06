import { createDetailedMessage } from "@jsenv/logger"
import { resolveUrl, urlToFileSystemPath, urlToExtension } from "@jsenv/util"
import { resolveFile } from "./resolveFile.js"

const magicExtensions = ["js", "json", "node"]

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

  const mainFileUrl = await resolveFile(mainFileUrlFirstCandidate, {
    magicExtensions,
  })

  if (!mainFileUrl) {
    // we know in advance this remapping does not lead to an actual file.
    // we only warn because we have no guarantee this remapping will actually be used
    // in the codebase.
    // warn only if there is actually a main field
    // otherwise the package.json is missing the main field
    // it certainly means it's not important
    if (packageMainFieldName !== "default") {
      logger.warn(
        formatFileNotFoundLog({
          fileUrl: mainFileUrlFirstCandidate,
          magicExtensions,
        }),
      )
      return mainFileUrlFirstCandidate
    }
  }

  return mainFileUrl
}

const formatFileNotFoundLog = ({ specifier, expectedUrl, magicExtensions, importedIn }) => {
  return createDetailedMessage(`Cannot find file for "${specifier}"`, {
    "imported in": importedIn,
    "file url": expectedUrl,
    ...(urlToExtension(expectedUrl) === ""
      ? { ["extensions tried"]: magicExtensions.join(`,`) }
      : {}),
  })
}
