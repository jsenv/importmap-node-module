import { fileRead } from "@dmail/helper"

export const readPackageData = async ({ path, returnNullWhenNotFound = false, onWarn }) => {
  try {
    const packageString = await fileRead(path)
    const packageData = JSON.parse(packageString)
    return packageData
  } catch (e) {
    if (e && e.code === "ENOENT") {
      if (returnNullWhenNotFound) {
        return null
      }

      onWarn({
        code: "PACKAGE_NOT_FOUND",
        message: createPackageNotFoundMessage({ path }),
        data: { path },
      })
      return {}
    }
    if (e && e.name === "SyntaxError") {
      onWarn({
        code: "PACKAGE_PARSING_ERROR",
        message: createPackageParsingErrorMessage({ path, syntaxError: e }),
        data: { path, syntaxError: e },
      })
      return {}
    }

    throw e
  }
}

const createPackageNotFoundMessage = ({ path }) => `cannot find package.json.
--- package.json path ---
${path}`

const createPackageParsingErrorMessage = ({
  path,
  syntaxError,
}) => `error while parsing package.json.
--- package.json path ---
${path}
--- syntax error message ---
${syntaxError.message}`
