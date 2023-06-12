import { readEntryStat } from "@jsenv/filesystem";
import { resolveUrl, urlToFilename } from "@jsenv/urls";
import { findAsync } from "./find_async.js";

export const resolveFile = async (
  fileUrl,
  { magicDirectoryIndexEnabled, magicExtensionEnabled, extensionsToTry },
) => {
  const fileStat = await readEntryStat(fileUrl, {
    nullIfNotFound: true,
  });

  // file found
  if (fileStat && fileStat.isFile()) {
    return {
      found: true,
      url: fileUrl,
    };
  }

  // directory found
  if (fileStat && fileStat.isDirectory()) {
    if (magicDirectoryIndexEnabled) {
      const indexFileSuffix = fileUrl.endsWith("/") ? "index" : "/index";
      const indexFileUrl = `${fileUrl}${indexFileSuffix}`;
      const result = await resolveFile(indexFileUrl, {
        magicExtensionEnabled,
        magicDirectoryIndexEnabled: false,
        extensionsToTry,
      });
      return {
        magicDirectoryIndex: true,
        ...result,
      };
    }

    return {
      found: false,
      url: fileUrl,
    };
  }

  if (!magicExtensionEnabled) {
    return {
      found: false,
      url: fileUrl,
    };
  }

  const extensionLeadingToAFile = await findExtensionLeadingToFile(
    fileUrl,
    extensionsToTry,
  );
  // magic extension not found
  if (extensionLeadingToAFile === null) {
    return {
      found: false,
      url: fileUrl,
    };
  }
  // magic extension worked
  return {
    magicExtension: extensionLeadingToAFile,
    found: true,
    url: `${fileUrl}${extensionLeadingToAFile}`,
  };
};

const findExtensionLeadingToFile = async (fileUrl, extensionsToTry) => {
  const urlDirectoryUrl = resolveUrl("./", fileUrl);
  const urlFilename = urlToFilename(fileUrl);
  const extensionLeadingToFile = await findAsync({
    array: extensionsToTry,
    start: async (extensionToTry) => {
      const urlCandidate = `${urlDirectoryUrl}${urlFilename}${extensionToTry}`;
      const stats = await readEntryStat(urlCandidate, {
        nullIfNotFound: true,
      });
      return stats && stats.isFile() ? extensionToTry : null;
    },
    predicate: (extension) => Boolean(extension),
  });
  return extensionLeadingToFile || null;
};
