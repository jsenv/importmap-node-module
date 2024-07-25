import { assertAndNormalizeDirectoryUrl, readFile } from "@jsenv/filesystem";
import { moveImportMap, sortImportMap } from "@jsenv/importmap";
import { resolveUrl } from "@jsenv/urls";

export const getImportMapFromFile = async ({
  projectDirectoryUrl,
  importMapFileRelativeUrl,
}) => {
  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl);

  const importmapFileUrl = resolveUrl(
    importMapFileRelativeUrl,
    projectDirectoryUrl,
  );
  const importmap = await readFile(importmapFileUrl, { as: "json" });

  // ensure the importmap is now relative to the project directory url
  // we do that because writeImportMapFile expect all importmap
  // to be relative to the projectDirectoryUrl
  const importmapFakeRootUrl = resolveUrl(
    "whatever.importmap",
    projectDirectoryUrl,
  );
  const importmapRelativeToProject = moveImportMap(
    importmap,
    importmapFileUrl,
    importmapFakeRootUrl,
  );

  return sortImportMap(importmapRelativeToProject);
};
