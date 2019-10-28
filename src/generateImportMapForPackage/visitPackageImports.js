import { fileUrlToPath, hasScheme } from "../urlHelpers.js"

export const visitPackageImports = ({ logger, packageFileUrl, packageJsonObject }) => {
  const importsForPackageImports = {}
  const packageFilePath = fileUrlToPath(packageFileUrl)

  const { imports: packageImports } = packageJsonObject
  if (typeof packageImports !== "object" || packageImports === null) {
    logger.warn(`
imports of package.json must be an object.
--- package.json imports ---
${packageImports}
--- package.json path ---
${packageFilePath}
`)
    return importsForPackageImports
  }

  Object.keys(packageImports).forEach((specifier) => {
    if (hasScheme(specifier) || specifier.startsWith("//") || specifier.startsWith("../")) {
      logger.warn(`
found unexpected specifier in imports of package.json, it must be relative to package.json.
--- specifier ---
${specifier}
--- package.json path ---
${packageFilePath}
`)
      return
    }

    const address = packageImports[specifier]
    if (typeof address !== "string") {
      logger.warn(`
found unexpected address in imports of package.json, it must be a string.
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
found unexpected address in imports of package.json, it must be relative to package.json.
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
      from = specifier
    } else {
      from = specifier
    }

    const to = address

    importsForPackageImports[from] = to
  })

  return importsForPackageImports
}
