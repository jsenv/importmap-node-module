import { hasScheme, fileUrlToPath } from "./urlHelpers.js"

export const visitPackageExports = ({
  logger,
  packageFileUrl,
  packageName,
  packageJsonObject,
  packageInfo: { packageIsRoot, packageDirectoryRelativePath },
}) => {
  const importsForPackageExports = {}

  if (packageIsRoot) {
    return importsForPackageExports
  }

  const packageFilePath = fileUrlToPath(packageFileUrl)
  const { exports: packageExports } = packageJsonObject
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

    const address = packageExports[specifier]
    if (typeof address !== "string") {
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
