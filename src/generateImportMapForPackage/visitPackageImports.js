import { pathnameToOperatingSystemPath } from "@jsenv/operating-system-path"
import { hasScheme } from "./hasScheme.js"

export const visitPackageImports = ({ logger, packagePathname, packageData }) => {
  const importsForPackageImports = {}

  const { imports: packageImports } = packageData
  if (typeof packageImports !== "object" || packageImports === null) {
    logger.warn(
      writeImportsMustBeObject({
        packagePathname,
        packageImports,
      }),
    )
    return importsForPackageImports
  }

  Object.keys(packageImports).forEach((specifier) => {
    if (hasScheme(specifier) || specifier.startsWith("//") || specifier.startsWith("../")) {
      logger.warn(
        writeSpecifierMustBeRelative({
          packagePathname,
          specifier,
        }),
      )
      return
    }

    const address = packageImports[specifier]
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
      from = specifier
    } else {
      from = specifier
    }

    const to = address

    importsForPackageImports[from] = to
  })

  return importsForPackageImports
}

const writeImportsMustBeObject = ({ packagePathname, packageImports }) => `
imports of package.json must be an object.
--- package.json imports ---
${packageImports}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`

const writeAddressMustBeString = ({ packagePathname, specifier, address }) => `
found unexpected address in imports of package.json, it must be a string.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`

const writeSpecifierMustBeRelative = ({ packagePathname, specifier }) => `
found unexpected specifier in imports of package.json, it must be relative to package.json.
--- specifier ---
${specifier}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`

const writeAddressMustBeRelative = ({ packagePathname, specifier, address }) => `
found unexpected address in imports of package.json, it must be relative to package.json.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`
