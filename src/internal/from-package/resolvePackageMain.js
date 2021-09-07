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
  // nodeResolutionConditions = [],
}) => {
  const packageMain = packageInfo.object.main
  // main is explicitely empty meaning
  // it is assumed that we should not find a file
  if (packageMain === "") {
    return { found: false }
  }

  const relativeUrlToTry = packageMain
    ? packageMain.endsWith("/")
      ? `${packageMain}index`
      : packageMain
    : "./index"
  const urlFirstCandidate = resolveUrl(relativeUrlToTry, packageInfo.url)
  const packageDirectoryUrl = resolveUrl("./", packageInfo.url)

  if (!urlFirstCandidate.startsWith(packageDirectoryUrl)) {
    return {
      found: false,
      warning: createPackageMainFileMustBeRelativeWarning({
        packageMain,
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
    const warning = createPackageMainFileNotFoundWarning({
      specifier: relativeUrlToTry,
      packageInfo,
      fileUrl: urlFirstCandidate,
      magicExtensions: [".js", ".json", ".node"],
    })

    return {
      found: false,
      relativeUrl: urlToRelativeUrl(urlFirstCandidate, packageInfo.url),
      warning,
    }
  }

  return {
    found: true,
    relativeUrl: urlToRelativeUrl(url, packageInfo.url),
  }
}

const createPackageMainFileMustBeRelativeWarning = ({
  packageMain,
  packageInfo,
}) => {
  return {
    code: "PACKAGE_MAIN_FILE_MUST_BE_RELATIVE",
    message: `"main" field in package.json must be inside package.json folder.
--- main ---
${packageMain}
--- package.json path ---
${urlToFileSystemPath(packageInfo.url)}`,
  }
}

const createPackageMainFileNotFoundWarning = ({
  specifier,
  packageInfo,
  fileUrl,
  magicExtensions,
}) => {
  return {
    code: "PACKAGE_MAIN_FILE_NOT_FOUND",
    message: createDetailedMessage(
      `Cannot find package main file "${specifier}"`,
      {
        "package.json path": urlToFileSystemPath(packageInfo.url),
        ...(urlToExtension(fileUrl) === ""
          ? { ["extensions tried"]: magicExtensions.join(`, `) }
          : {}),
      },
    ),
  }
}
