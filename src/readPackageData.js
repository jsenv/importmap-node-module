import { fileRead } from "@dmail/helper"

export const readPackageData = async ({ filename, returnNullWhenNotFound = false }) => {
  try {
    const packageString = await fileRead(filename)
    const packageData = JSON.parse(packageString)
    return packageData
  } catch (e) {
    if (e && e.code === "ENOENT") {
      if (returnNullWhenNotFound) {
        return null
      }
      throw new Error(createMissingPackageMessage({ filename }))
    }
    if (e && e.name === "SyntaxError") {
      throw new Error(createMalformedPackageMessage({ filename }))
    }
    throw e
  }
}

const createMissingPackageMessage = ({ filename }) =>
  new Error(`missing package.json.
filename: ${filename}`)

const createMalformedPackageMessage = ({
  filename,
  syntaxError,
}) => `error while parsing package.json.
filename: ${filename}
syntaxError: ${syntaxError}`
