import { fileUrlToDirectoryUrl, fileUrlToPath } from "../src/internal/urlHelpers.js"

export const importMetaUrlToDirectoryPath = (importMetaURL) => {
  const directoryUrl = fileUrlToDirectoryUrl(importMetaURL)
  const directoryPath = fileUrlToPath(directoryUrl)
  return directoryPath
}
