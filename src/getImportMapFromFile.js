import { assertAndNormalizeDirectoryUrl, resolveUrl, readFile } from "@jsenv/util"
import { moveImportMap, sortImportMap } from "@jsenv/import-map"

export const getImportMapFromFile = async ({ projectDirectoryUrl, importMapFileRelativeUrl }) => {
  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl)

  const importmapFileUrl = resolveUrl(importMapFileRelativeUrl, projectDirectoryUrl)
  const importmap = await readFile(importmapFileUrl, { as: "json" })

  // ensure the importmap is now relative to the project directory url
  // we do that because generateImportMapForProject expect all importmap
  // to be relative to the projectDirectoryUrl
  const importmapFakeRootUrl = resolveUrl("whatever.importmap", projectDirectoryUrl)
  const importmapRelativeToProject = moveImportMap(
    importmap,
    importmapFileUrl,
    importmapFakeRootUrl,
  )

  return sortImportMap(importmapRelativeToProject)
}
