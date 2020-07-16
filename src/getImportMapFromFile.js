import { readFile, assertAndNormalizeFileUrl } from "@jsenv/util"

export const getImportMapFromFile = async (importMapFilePath) => {
  const importMapFileUrl = assertAndNormalizeFileUrl(importMapFilePath)
  const importMapFileContent = await readFile(importMapFileUrl)
  const importMap = JSON.parse(importMapFileContent)
  return importMap
}
