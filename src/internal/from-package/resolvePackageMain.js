import { createDetailedMessage } from "@jsenv/logger"
import { resolveUrl, urlToFileSystemPath, urlToExtension } from "@jsenv/util"
import { resolveFile } from "../resolveFile.js"

const magicExtensions = [".js", ".json", ".node"]

export const resolvePackageMain = ({
  warn,
  packagesExportsPreference,
  packageFileUrl,
  packageJsonObject,
}) => {
  if (packagesExportsPreference.includes("import") && "module" in packageJsonObject) {
    return resolveMainFile({
      warn,
      packageFileUrl,
      packageMainFieldName: "module",
      packageMainFieldValue: packageJsonObject.module,
    })
  }

  if (packagesExportsPreference.includes("import") && "jsnext:main" in packageJsonObject) {
    return resolveMainFile({
      warn,
      packageFileUrl,
      packageMainFieldName: "jsnext:main",
      packageMainFieldValue: packageJsonObject["jsnext:main"],
    })
  }

  if (packagesExportsPreference.includes("browser") && "browser" in packageJsonObject) {
    return resolveMainFile({
      warn,
      packageFileUrl,
      packageMainFieldName: "browser",
      packageMainFieldValue: packageJsonObject.browser,
    })
  }

  if ("main" in packageJsonObject) {
    return resolveMainFile({
      warn,
      packageFileUrl,
      packageMainFieldName: "main",
      packageMainFieldValue: packageJsonObject.main,
    })
  }

  return resolveMainFile({
    warn,
    packageFileUrl,
    packageMainFieldName: "default",
    packageMainFieldValue: "index",
  })
}

const resolveMainFile = async ({
  warn,
  packageFileUrl,
  packageMainFieldName,
  packageMainFieldValue,
}) => {
  // main is explicitely empty meaning
  // it is assumed that we should not find a file
  if (packageMainFieldValue === "") {
    return null
  }

  const packageDirectoryUrl = resolveUrl("./", packageFileUrl)
  const mainFileRelativeUrl = packageMainFieldValue.endsWith("/")
    ? `${packageMainFieldValue}index`
    : packageMainFieldValue

  const mainFileUrlFirstCandidate = resolveUrl(mainFileRelativeUrl, packageFileUrl)

  if (!mainFileUrlFirstCandidate.startsWith(packageDirectoryUrl)) {
    warn(
      createPackageMainFileMustBeRelativeWarning({
        packageMainFieldName,
        packageMainFieldValue,
        packageFileUrl,
      }),
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
      warn(
        createPackageMainFileNotFoundWarning({
          specifier: packageMainFieldValue,
          importedIn: `${packageFileUrl}#${packageMainFieldName}`,
          fileUrl: mainFileUrlFirstCandidate,
          magicExtensions,
        }),
      )
    }
    return mainFileUrlFirstCandidate
  }

  return mainFileUrl
}

const createPackageMainFileMustBeRelativeWarning = ({
  packageMainFieldName,
  packageMainFieldValue,
  packageFileUrl,
}) => {
  return {
    code: "PACKAGE_MAIN_FILE_MUST_BE_RELATIVE",
    message: `${packageMainFieldName} field in package.json must be inside package.json folder.
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`,
  }
}

const createPackageMainFileNotFoundWarning = ({
  specifier,
  importedIn,
  fileUrl,
  magicExtensions,
}) => {
  return {
    code: "PACKAGE_MAIN_FILE_NOT_FOUND",
    message: createDetailedMessage(`Cannot find file for "${specifier}"`, {
      "imported in": importedIn,
      "file url tried": fileUrl,
      ...(urlToExtension(fileUrl) === ""
        ? { ["extensions tried"]: magicExtensions.join(`, `) }
        : {}),
    }),
  }
}
