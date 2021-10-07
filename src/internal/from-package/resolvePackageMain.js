import { createDetailedMessage } from "@jsenv/logger"
import {
  resolveUrl,
  urlToFileSystemPath,
  urlToExtension,
  urlToRelativeUrl,
} from "@jsenv/filesystem"

import { resolveFile } from "../resolveFile.js"

export const resolvePackageMain = async ({
  warn,
  packageInfo,
  packageConditions,
}) => {
  const packageDirectoryUrl = resolveUrl("./", packageInfo.url)
  const packageEntryFieldName = decidePackageEntryFieldName({
    warn,
    packageConditions,
    packageInfo,
  })
  return tryToResolvePackageEntryFile({
    packageEntryFieldName,
    packageDirectoryUrl,
    packageInfo,
  })
}

const decidePackageEntryFieldName = ({
  warn,
  packageConditions,
  packageInfo,
}) => {
  let fieldFound
  packageConditions.find((condition) => {
    if (condition === "import") {
      const moduleFieldValue = packageInfo.object.module
      if (typeof moduleFieldValue === "string") {
        fieldFound = "module"
        return true
      }
      const jsNextFieldValue = packageInfo.object["jsnext:main"]
      if (typeof jsNextFieldValue === "string") {
        fieldFound = "jsnext:main"
        return true
      }
      return false
    }
    if (condition === "browser") {
      const browserFieldValue = packageInfo.object.browser
      if (typeof browserFieldValue === "string") {
        fieldFound = "browser"
        return true
      }
      if (typeof browserFieldValue === "object") {
        // the browser field can be an object, for now it's not supported
        // see https://github.com/defunctzombie/package-browser-field-spec
        // as a workaround it's possible to use "packageManualOverrides"
        const suggestedOverride = {
          [packageInfo.object.name]: {
            exports: {
              browser: browserFieldValue,
            },
          },
        }
        warn({
          code: "BROWSER_FIELD_NOT_IMPLEMENTED",
          message: createDetailedMessage(
            `Found an object "browser" field in a package.json, this is not supported.`,
            {
              "package.json path": urlToFileSystemPath(packageInfo.url),
              "suggestion": `Add the following into "packageManualOverrides"
${JSON.stringify(suggestedOverride, null, "  ")}
As explained in https://github.com/jsenv/importmap-node-module#packagesmanualoverrides`,
            },
          ),
        })
        return false
      }

      return false
    }
    return false
  })
  if (fieldFound) {
    return fieldFound
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
