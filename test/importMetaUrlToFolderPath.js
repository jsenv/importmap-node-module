import { pathnameToOperatingSystemPath } from "@jsenv/operating-system-path"

export const importMetaURLToFolderPath = (importMetaURL) => {
  const pathname = importMetaURL.slice("file://".length)
  const folderPathname = pathnameToDirname(pathname)
  return pathnameToOperatingSystemPath(folderPathname)
}

const pathnameToDirname = (pathname) => {
  const slashLastIndex = pathname.lastIndexOf("/")
  if (slashLastIndex === -1) return ""

  return pathname.slice(0, slashLastIndex)
}
