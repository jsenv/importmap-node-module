import { pathnameToOperatingSystemPath } from "@jsenv/operating-system-path"
import { hasScheme } from "./hasScheme.js"

export const visitPackageExports = ({
  logger,
  packagePathname,
  packageName,
  packageData,
  packagePathInfo: { packageIsRoot, actualRelativePath },
}) => {
  const importsForPackageExports = {}

  if (packageIsRoot) {
    return importsForPackageExports
  }

  const { exports: packageExports } = packageData
  if (typeof packageExports !== "object" || packageExports === null) {
    logger.warn(
      writeExportsMustBeAnObject({
        packageExports,
        packagePathname,
      }),
    )
    return importsForPackageExports
  }

  Object.keys(packageExports).forEach((specifier) => {
    if (hasScheme(specifier) || specifier.startsWith("//") || specifier.startsWith("../")) {
      logger.warn(
        writeSpecifierMustBeRelative({
          packagePathname,
          specifier,
        }),
      )
      return
    }

    const address = packageExports[specifier]
    if (typeof address !== "string") {
      logger.warn(
        writeAddressMustBeString({
          packagePathname,
          specifier,
          address,
        }),
      )
      return
    }
    if (hasScheme(address) || address.startsWith("//") || address.startsWith("../")) {
      logger.warn(
        writeAddressMustBeRelative({
          packagePathname,
          specifier,
          address,
        }),
      )
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
      to = `.${actualRelativePath}${specifier.slice(1)}`
    } else {
      to = `.${actualRelativePath}/${address}`
    }

    importsForPackageExports[from] = to
  })

  return importsForPackageExports
}

const writeExportsMustBeAnObject = ({
  packagePathname,
  packageExports,
}) => `exports of package.json must be an object.
--- package.json exports ---
${packageExports}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}`

const writeSpecifierMustBeRelative = ({
  packagePathname,
  specifier,
}) => `found unexpected specifier in exports of package.json, it must be relative to package.json.
--- specifier ---
${specifier}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}`

const writeAddressMustBeString = ({
  packagePathname,
  specifier,
  address,
}) => `found unexpected address in exports of package.json, it must be a string.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}`

const writeAddressMustBeRelative = ({
  packagePathname,
  specifier,
  address,
}) => `found unexpected address in exports of package.json, it must be relative to package.json.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}`
