import { readFile, urlToFileSystemPath } from "@jsenv/util"
import { applyPackageManualOverride } from "./applyPackageManualOverride.js"

export const PACKAGE_NOT_FOUND = {}
export const PACKAGE_WITH_SYNTAX_ERROR = {}

export const readPackageFile = async (packageFileUrl, packagesManualOverrides) => {
  try {
    const packageObject = await readFile(packageFileUrl, { as: "json" })
    return applyPackageManualOverride(packageObject, packagesManualOverrides)
  } catch (e) {
    if (e.code === "ENOENT") {
      return PACKAGE_NOT_FOUND
    }

    if (e.name === "SyntaxError") {
      console.error(formatPackageSyntaxErrorLog({ syntaxError: e, packageFileUrl }))
      return PACKAGE_WITH_SYNTAX_ERROR
    }

    throw e
  }
}

const formatPackageSyntaxErrorLog = ({ syntaxError, packageFileUrl }) => {
  return `
error while parsing package.json.
--- syntax error message ---
${syntaxError.message}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}
`
}
