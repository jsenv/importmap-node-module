// https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_package_exports

import { hasScheme, urlToFilePath } from "./urlUtils.js"

export const visitPackageExports = ({
  logger,
  packageFileUrl,
  packageName,
  packageJsonObject,
  packageInfo: { packageDirectoryRelativeUrl },
  favoredExports,
}) => {
  const importsForPackageExports = {}

  const packageFilePath = urlToFilePath(packageFileUrl)
  const { exports: packageExports } = packageJsonObject

  // false is allowed as laternative to exports: {}
  if (packageExports === false) return importsForPackageExports

  // exports used to indicate the main file
  if (typeof packageExports === "string") {
    const from = packageName
    const to = packageExports
    importsForPackageExports[from] = to
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
    if (hasScheme(specifier) || specifier.startsWith("//") || specifier.startsWith("../")) {
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
      const favoredExport = favoredExports.find((key) => key in value)

      if (favoredExport) {
        address = value[favoredExport]
      } else if ("default" in value) {
        address = value.default
      } else {
        return
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

    if (hasScheme(address) || address.startsWith("//") || address.startsWith("../")) {
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

    let from
    if (specifier === ".") {
      from = packageName
    } else if (specifier[0] === "/") {
      from = specifier
    } else if (specifier.startsWith("./")) {
      from = `${packageName}${specifier.slice(1)}`
    } else {
      from = `${packageName}/${specifier}`
    }

    let to
    if (address[0] === "/") {
      to = address
    } else if (address.startsWith("./")) {
      to = `./${packageDirectoryRelativeUrl}${address.slice(2)}`
    } else {
      to = `./${packageDirectoryRelativeUrl}${address}`
    }

    importsForPackageExports[from] = to
  })

  return importsForPackageExports
}
