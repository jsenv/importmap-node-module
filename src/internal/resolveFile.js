import {
  resolveUrl,
  readFileSystemNodeStat,
  urlToFilename,
  urlToExtension,
} from "@jsenv/filesystem"
import { firstOperationMatching } from "@jsenv/cancellation"

export const resolveFile = async (
  fileUrl,
  { magicDirectoryIndexEnabled, magicExtensionEnabled, magicExtensions },
) => {
  const fileStat = await readFileSystemNodeStat(fileUrl, {
    nullIfNotFound: true,
  })

  // file found
  if (fileStat && fileStat.isFile()) {
    return {
      found: true,
      url: fileUrl,
    }
  }

  // directory found
  if (fileStat && fileStat.isDirectory()) {
    if (magicDirectoryIndexEnabled) {
      const indexFileSuffix = fileUrl.endsWith("/") ? "index" : "/index"
      const indexFileUrl = `${fileUrl}${indexFileSuffix}`
      const result = await resolveFile(indexFileUrl, {
        magicExtensionEnabled,
        magicDirectoryIndexEnabled: false,
        magicExtensions,
      })
      return {
        magicDirectoryIndex: true,
        ...result,
      }
    }

    return {
      found: false,
      url: fileUrl,
    }
  }

  if (!magicExtensionEnabled) {
    return {
      found: false,
      url: fileUrl,
    }
  }

  // file already has an extension, magic extension cannot be used
  const extension = urlToExtension(fileUrl)
  if (extension !== "") {
    return {
      found: false,
      url: fileUrl,
    }
  }

  const extensionLeadingToAFile = await findExtensionLeadingToFile(
    fileUrl,
    magicExtensions,
  )
  // magic extension not found
  if (extensionLeadingToAFile === null) {
    return {
      found: false,
      url: fileUrl,
    }
  }
  // magic extension worked
  return {
    magicExtension: extensionLeadingToAFile,
    found: true,
    url: `${fileUrl}${extensionLeadingToAFile}`,
  }
}

const findExtensionLeadingToFile = async (fileUrl, magicExtensions) => {
  const urlDirectoryUrl = resolveUrl("./", fileUrl)
  const urlFilename = urlToFilename(fileUrl)
  const extensionLeadingToFile = await firstOperationMatching({
    array: magicExtensions,
    start: async (extensionCandidate) => {
      const urlCandidate = `${urlDirectoryUrl}${urlFilename}${extensionCandidate}`
      const stats = await readFileSystemNodeStat(urlCandidate, {
        nullIfNotFound: true,
      })
      return stats && stats.isFile() ? extensionCandidate : null
    },
    predicate: (extension) => Boolean(extension),
  })
  return extensionLeadingToFile || null
}
