// https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_package_exports

import { urlToFileSystemPath } from "@jsenv/util"
import { specifierIsRelative } from "./specifierIsRelative.js"

export const visitPackageExports = ({
  logger,
  packageFileUrl,
  packageName,
  packageJsonObject,
  packageInfo: { packageDirectoryRelativeUrl },
  packagesExportsPreference,
}) => {
  const importsForPackageExports = {}

  const packageFilePath = urlToFileSystemPath(packageFileUrl)
  const { exports: packageExports } = packageJsonObject

  // false is allowed as laternative to exports: {}
  if (packageExports === false) {
    return importsForPackageExports
  }

  const addRemapping = ({ from, to }) => {
    if (from.indexOf("*") === -1) {
      importsForPackageExports[from] = to
      return
    }

    if (
      from.endsWith("/*") &&
      to.endsWith("/*") &&
      // ensure ends with '*' AND there is only one '*' occurence
      to.indexOf("*") === to.length - 1
    ) {
      const fromWithouTrailingStar = from.slice(0, -1)
      const toWithoutTrailingStar = to.slice(0, -1)
      importsForPackageExports[fromWithouTrailingStar] = toWithoutTrailingStar
      return
    }

    logger.warn(`Ignoring export using "*" because it is not supported by importmap.
--- key ---
${from}
--- value ---
${to}
--- package.json path ---
${packageFilePath}
--- see also ---
https://github.com/WICG/import-maps/issues/232`)
  }

  // exports used to indicate the main file
  if (typeof packageExports === "string") {
    addRemapping({
      from: packageName,
      to: addressToDestination(packageExports, packageDirectoryRelativeUrl),
    })
    return importsForPackageExports
  }

  if (typeof packageExports !== "object" || packageExports === null) {
    logger.warn(`
exports of package.json must be an object.
--- package.json exports ---
${packageExports}
--- package.json path ---
${packageFilePath}
`)
    return importsForPackageExports
  }

  const packageExportsKeys = Object.keys(packageExports)
  const someSpecifierStartsWithDot = packageExportsKeys.some((key) => key.startsWith("."))
  if (someSpecifierStartsWithDot) {
    const someSpecifierDoesNotStartsWithDot = packageExportsKeys.some((key) => !key.startsWith("."))
    if (someSpecifierDoesNotStartsWithDot) {
      // see https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_exports_sugar
      logger.error(`
exports of package.json mixes conditional exports and direct exports.
--- package.json path ---
${packageFilePath}
`)
      return importsForPackageExports
    }
  }

  packageExportsKeys.forEach((specifier) => {
    if (!specifierIsRelative(specifier)) {
      logger.warn(`
found unexpected specifier in exports of package.json, it must be relative to package.json.
--- specifier ---
${specifier}
--- package.json path ---
${packageFilePath}
`)
      return
    }

    const value = packageExports[specifier]
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
      logger.warn(`
found unexpected address in exports of package.json, it must be a string.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${packageFilePath}
`)
      return
    }

    if (!specifierIsRelative(address)) {
      logger.warn(`
found unexpected address in exports of package.json, it must be relative to package.json.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${packageFilePath}
`)
      return
    }

    addRemapping({
      from: specifierToSource(specifier, packageName),
      to: addressToDestination(address, packageDirectoryRelativeUrl),
    })
  })

  return importsForPackageExports
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
