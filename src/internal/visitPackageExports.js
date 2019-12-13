// https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_package_exports

import { hasScheme, urlToFilePath } from "./urlUtils.js"

export const visitPackageExports = ({
  logger,
  packageFileUrl,
  packageName,
  packageJsonObject,
  packageInfo: { packageIsRoot, packageDirectoryRelativeUrl },
  favoredExports,
}) => {
  const importsForPackageExports = {}

  if (packageIsRoot) {
    return importsForPackageExports
  }

  const packageFilePath = urlToFilePath(packageFileUrl)
  const { exports: rawPackageExports } = packageJsonObject

  // false is allowed as laternative to exports: {}
  if (rawPackageExports === false) return importsForPackageExports

  // string allowed, exports becomes an alternative to main or module field
  if (typeof rawPackageExports === "string") return importsForPackageExports

  if (typeof rawPackageExports !== "object" || rawPackageExports === null) {
    logger.warn(`
exports of package.json must be an object.
--- package.json exports ---
${rawPackageExports}
--- package.json path ---
${packageFilePath}
`)
    return importsForPackageExports
  }

  const favoredExport = favoredExports
    ? favoredExports.find((favoredExportCandidate) => favoredExportCandidate in rawPackageExports)
    : null
  const packageExports = favoredExport ? rawPackageExports[favoredExport] : rawPackageExports

  Object.keys(packageExports).forEach((specifier) => {
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
      if (!favoredExport) {
        return
      }
      if (favoredExport in value === false) {
        return
      }
      address = value[favoredExport]
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
    if (specifier[0] === "/") {
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
