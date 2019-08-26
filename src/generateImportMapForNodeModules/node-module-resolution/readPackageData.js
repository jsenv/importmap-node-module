import { fileRead } from "@dmail/helper"

export const readPackageData = async ({ path, returnNullWhenNotFound = false }) => {
  try {
    const packageString = await fileRead(path)
    const packageData = JSON.parse(packageString)
    return packageData
  } catch (e) {
    if (e && e.code === "ENOENT") {
      if (returnNullWhenNotFound) {
        return null
      }
      throw new Error(createMissingPackageMessage({ path }))
    }
    if (e && e.name === "SyntaxError") {
      throw new Error(createMalformedPackageMessage({ path, syntaxError: e }))
    }
    throw e
  }
}

const createMissingPackageMessage = ({ path }) => `missing package.json.
path: ${path}`

const createMalformedPackageMessage = ({ path, syntaxError }) => `error while parsing package.json.
path: ${path}
syntax error message: ${syntaxError.message}`
