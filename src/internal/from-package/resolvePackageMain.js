import { createDetailedMessage } from "@jsenv/logger"
import {
  resolveUrl,
  urlToFileSystemPath,
  urlToExtension,
  urlToRelativeUrl,
} from "@jsenv/filesystem"

import { resolveFile } from "../resolveFile.js"

export const resolvePackageMain = async ({
  packageInfo,
  packageConditions,
}) => {
  const packageDirectoryUrl = resolveUrl("./", packageInfo.url)
  const packageEntryFieldName = decidePackageEntryFieldName({
    packageConditions,
    packageInfo,
  })
  return tryToResolvePackageEntryFile({
    packageEntryFieldName,
    packageDirectoryUrl,
    packageInfo,
  })
}

const decidePackageEntryFieldName = ({ packageConditions, packageInfo }) => {
  if (packageConditions.includes("import")) {
    const packageModule = packageInfo.object.module
    if (typeof packageModule === "string") {
      return "module"
    }

    const packageJsNextMain = packageInfo.object["jsnext:main"]
    if (typeof packageJsNextMain === "string") {
      return "jsnext:main"
    }
  }

  return "main"
}

const tryToResolvePackageEntryFile = async ({
  packageEntryFieldName,
  packageDirectoryUrl,
  packageInfo,
}) => {
  const packageEntrySpecifier = packageInfo.object[packageEntryFieldName]
  // explicitely empty meaning
  // it is assumed that we should not find a file
  if (packageEntrySpecifier === "") {
    return { found: false, packageEntryFieldName }
  }

  const relativeUrlToTry = packageEntrySpecifier
    ? packageEntrySpecifier.endsWith("/")
      ? `${packageEntrySpecifier}index`
      : packageEntrySpecifier
    : "./index"

  const urlFirstCandidate = resolveUrl(relativeUrlToTry, packageDirectoryUrl)

  if (!urlFirstCandidate.startsWith(packageDirectoryUrl)) {
    return {
      found: false,
      packageEntryFieldName,
      warning: createPackageEntryMustBeRelativeWarning({
        packageEntryFieldName,
        packageInfo,
      }),
    }
  }

  const { found, url } = await resolveFile(urlFirstCandidate, {
    magicDirectoryIndexEnabled: true,
    magicExtensionEnabled: true,
    magicExtensions: [".js", ".json", ".node"],
  })

  if (!found) {
    const warning = createPackageEntryNotFoundWarning({
      packageEntryFieldName,
      packageInfo,
      fileUrl: urlFirstCandidate,
      magicExtensions: [".js", ".json", ".node"],
    })

    return {
      found: false,
      packageEntryFieldName,
      relativeUrl: urlToRelativeUrl(urlFirstCandidate, packageInfo.url),
      warning,
    }
  }

  return {
    found: true,
    packageEntryFieldName,
    relativeUrl: urlToRelativeUrl(url, packageInfo.url),
  }
}

const createPackageEntryMustBeRelativeWarning = ({
  packageEntryFieldName,
  packageInfo,
}) => {
  return {
    code: "PACKAGE_ENTRY_MUST_BE_RELATIVE",
    message: createDetailedMessage(
      `"${packageEntryFieldName}" field in package.json must be inside package.json directory`,
      {
        [packageEntryFieldName]: packageInfo.object[packageEntryFieldName],
        "package.json path": urlToFileSystemPath(packageInfo.url),
      },
    ),
  }
}

const createPackageEntryNotFoundWarning = ({
  packageEntryFieldName,
  packageInfo,
  fileUrl,
  magicExtensions,
}) => {
  return {
    code: "PACKAGE_ENTRY_NOT_FOUND",
    message: createDetailedMessage(
      `File not found for package.json "${packageEntryFieldName}" field`,
      {
        [packageEntryFieldName]: packageInfo.object[packageEntryFieldName],
        "package.json path": urlToFileSystemPath(packageInfo.url),
        "url tried": urlToFileSystemPath(fileUrl),
        ...(urlToExtension(fileUrl) === ""
          ? { ["extensions tried"]: magicExtensions.join(`, `) }
          : {}),
      },
    ),
  }
}
