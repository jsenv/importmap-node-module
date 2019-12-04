import { hasScheme, fileUrlToPath } from "./urlHelpers.js"

// TODO: update with latest behaviour
// documented in https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_package_exports

export const visitPackageExports = ({
  logger,
  packageFileUrl,
  packageName,
  packageJsonObject,
  packageInfo: { packageIsRoot, packageDirectoryRelativePath },
  // maybe should depend on package.json field type
  // "module" -> "default"
  // "commonjs" -> "required"
  // undefined -> "default"
  packageExportCondition = "default",
}) => {
  const importsForPackageExports = {}

  if (packageIsRoot) {
    return importsForPackageExports
  }

  const packageFilePath = fileUrlToPath(packageFileUrl)
  const { exports: rawPackageExports } = packageJsonObject
  if (typeof rawPackageExports !== "object" || rawPackageExports === null) {
    if (rawPackageExports === false) return importsForPackageExports

    logger.warn(`
exports of package.json must be an object.
--- package.json exports ---
${rawPackageExports}
--- package.json path ---
${packageFilePath}
`)
    return importsForPackageExports
  }

  const packageExports =
    packageExportCondition in rawPackageExports
      ? rawPackageExports[packageExportCondition]
      : rawPackageExports

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
      if (packageExportCondition in value === false) {
        return
      }
      address = value[packageExportCondition]
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
      to = `${packageDirectoryRelativePath}${address.slice(2)}`
    } else {
      to = `${packageDirectoryRelativePath}${address}`
    }

    importsForPackageExports[from] = to
  })

  return importsForPackageExports
}
