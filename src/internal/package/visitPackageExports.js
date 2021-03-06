// https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_package_exports

import { urlToFileSystemPath, urlToRelativeUrl, resolveUrl } from "@jsenv/util"
import { specifierIsRelative } from "./specifierIsRelative.js"

export const visitPackageExports = ({
  packageFileUrl,
  packageJsonObject,
  packageExports = packageJsonObject.exports,
  packageName = packageJsonObject.name,
  projectDirectoryUrl,
  packagesExportsPreference,
  onExport,
  onWarn,
}) => {
  // false is allowed as alternative to exports: {}
  if (packageExports === false) {
    return
  }

  const packageDirectoryUrl = resolveUrl("./", packageFileUrl)
  const packageDirectoryRelativeUrl = urlToRelativeUrl(packageDirectoryUrl, projectDirectoryUrl)

  // exports used to indicate the main file
  if (typeof packageExports === "string") {
    onExport({
      key: packageName,
      value: addressToDestination(packageExports, packageDirectoryRelativeUrl),
    })
    return
  }

  if (typeof packageExports !== "object" || packageExports === null) {
    onWarn(formatUnexpectedExportsWarning({ packageExports, packageFileUrl }))
    return
  }

  const packageExportsKeys = Object.keys(packageExports)
  const someSpecifierStartsWithDot = packageExportsKeys.some((key) => key.startsWith("."))
  if (someSpecifierStartsWithDot) {
    const someSpecifierDoesNotStartsWithDot = packageExportsKeys.some((key) => !key.startsWith("."))
    if (someSpecifierDoesNotStartsWithDot) {
      // see https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_exports_sugar
      onWarn(formatMixedExportsWarning({ packageFileUrl }))
      return
    }
  }

  packageExportsKeys.forEach((key) => {
    if (!specifierIsRelative(key)) {
      onWarn(formatAbsoluteKeyInExportsWarning({ key, packageFileUrl }))
      return
    }

    const value = packageExports[key]
    let address

    if (typeof value === "object") {
      address = readFavoredKey(value, packagesExportsPreference)

      if (!address) {
        return
      }
      if (typeof address === "object") {
        address = readFavoredKey(address, packagesExportsPreference)
        if (!address) {
          return
        }
      }
    } else if (typeof value === "string") {
      address = value
    } else {
      onWarn(
        formatUnexpectedValueInExportsWarning({
          value,
          key,
          packageFileUrl,
        }),
      )
      return
    }

    if (!specifierIsRelative(address)) {
      onWarn(
        formatAbsoluteValueInExportsWarning({
          value: address,
          key,
          packageFileUrl,
        }),
      )
      return
    }

    onExport({
      key: specifierToSource(key, packageName),
      value: addressToDestination(address, packageDirectoryRelativeUrl),
    })
  })
}

const specifierToSource = (specifier, packageName) => {
  if (specifier === ".") {
    return packageName
  }

  if (specifier[0] === "/") {
    return specifier
  }

  if (specifier.startsWith("./")) {
    return `${packageName}${specifier.slice(1)}`
  }

  return `${packageName}/${specifier}`
}

const addressToDestination = (address, packageDirectoryRelativeUrl) => {
  if (address[0] === "/") {
    return address
  }

  if (address.startsWith("./")) {
    return `./${packageDirectoryRelativeUrl}${address.slice(2)}`
  }

  return `./${packageDirectoryRelativeUrl}${address}`
}

const readFavoredKey = (object, favoredKeys) => {
  const favoredKey = favoredKeys.find((key) => object.hasOwnProperty(key))
  if (favoredKey) {
    return object[favoredKey]
  }

  if (object.hasOwnProperty("default")) {
    return object.default
  }

  return undefined
}

const formatUnexpectedExportsWarning = ({ packageExports, packageFileUrl }) => {
  return `exports of package.json must be an object.
--- package.json exports ---
${packageExports}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}
`
}

const formatMixedExportsWarning = ({ packageFileUrl }) => {
  return `exports of package.json mixes conditional exports and direct exports.
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`
}

const formatAbsoluteKeyInExportsWarning = ({ key, packageFileUrl }) => {
  return `found unexpected key in exports of package.json, key must be relative to package.json.
--- key ---
${key}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`
}

const formatUnexpectedValueInExportsWarning = ({ value, key, packageFileUrl }) => {
  return `found unexpected value in exports of package.json, it must be a string.
--- value ---
${value}
--- key ---
${key}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`
}

const formatAbsoluteValueInExportsWarning = ({ value, key, packageFileUrl }) => {
  return `found unexpected value in exports of package.json, value must be relative to package.json.
--- value ---
${value}
--- key ---
${key}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`
}
