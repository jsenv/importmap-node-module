import { writeFileSync } from "@jsenv/filesystem";
import { urlToFileSystemPath } from "@jsenv/urls";

export const writeIntoFiles = (
  importmapInfos,
  { logger, projectDirectoryUrl },
) => {
  for (const importmapRelativeUrl of Object.keys(importmapInfos)) {
    const importmapInfo = importmapInfos[importmapRelativeUrl];
    const importmapUrl = new URL(importmapRelativeUrl, projectDirectoryUrl);
    const importmap = importmapInfo.importmap;
    writeFileSync(importmapUrl, JSON.stringify(importmap, null, "  "));
    logger.info(`-> ${urlToFileSystemPath(importmapUrl)}`);
  }
};
