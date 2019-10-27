import { hasScheme } from "./hasScheme.js"
import { fileURLToPath } from "url"

export const visitPackageExports = ({
  logger,
  packageFileUrl,
  packageName,
  packageData,
  packageInfo: { packageIsRoot, packageDirectoryRelativePath },
}) => {
  const packageFilePath = fileURLToPath(packageFileUrl)
  const importsForPackageExports = {}

  if (packageIsRoot) {
    return importsForPackageExports
  }

  const { exports: packageExports } = packageData
  if (typeof packageExports !== "object" || packageExports === null) {
    logger.warn(
      writeExportsMustBeAnObject({
        packageFilePath,
        packageExports,
      }),
    )
    return importsForPackageExports
  }

  Object.keys(packageExports).forEach((specifier) => {
    if (hasScheme(specifier) || specifier.startsWith("//") || specifier.startsWith("../")) {
      logger.warn(
        writeSpecifierMustBeRelative({
          packageFilePath,
          specifier,
        }),
      )
      return
    }

    const address = packageExports[specifier]
    if (typeof address !== "string") {
      logger.warn(
        writeAddressMustBeString({
          packageFilePath,
          specifier,
          address,
        }),
      )
      return
    }
    if (hasScheme(address) || address.startsWith("//") || address.startsWith("../")) {
      logger.warn(
        writeAddressMustBeRelative({
          packageFilePath,
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
      to = `${packageDirectoryRelativePath}${address.slice(2)}`
    } else {
      to = `${packageDirectoryRelativePath}${address}`
    }

    importsForPackageExports[from] = to
  })

  return importsForPackageExports
}

const writeExportsMustBeAnObject = ({ packageFilePath, packageExports }) => `
exports of package.json must be an object.
--- package.json exports ---
${packageExports}
--- package.json path ---
${packageFilePath}
`

const writeSpecifierMustBeRelative = ({ packageFilePath, specifier }) => `
found unexpected specifier in exports of package.json, it must be relative to package.json.
--- specifier ---
${specifier}
--- package.json path ---
${packageFilePath}
`

const writeAddressMustBeString = ({ packageFilePath, specifier, address }) => `
found unexpected address in exports of package.json, it must be a string.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${packageFilePath}
`

const writeAddressMustBeRelative = ({ packageFilePath, specifier, address }) => `
found unexpected address in exports of package.json, it must be relative to package.json.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${packageFilePath}
`
