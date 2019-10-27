import { fileURLToPath } from "url"

export const importMetaURLToDirectoryPath = (importMetaURL) => {
  const directoryUrl = new URL("./", importMetaURL)
  const directoryPath = fileURLToPath(directoryUrl)
  return directoryPath
}
