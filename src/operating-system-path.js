// this is duplicated from jsenv/core, maybe will be moved
// in its own internal module

export const operatingSystemPathToPathname = (operatingSystemPath) => {
  if (isWindowsPath(operatingSystemPath)) {
    return `/${replaceBackSlashWithSlash(operatingSystemPath)}`
  }

  // linux and mac operatingSystemFilename === pathname
  return operatingSystemPath
}

export const pathnameToOperatingSystemPath = (pathname) => {
  if (pathname[0] !== "/") throw new Error(`pathname must start with /`)

  const pathnameWithoutLeadingSlash = pathname.slice(1)
  if (
    startsWithWindowsDriveLetter(pathnameWithoutLeadingSlash) &&
    pathnameWithoutLeadingSlash[2] === "/"
  ) {
    return replaceSlashWithBackSlash(pathnameWithoutLeadingSlash)
  }

  // linux mac pathname === operatingSystemFilename
  return pathname
}

export const pathnameIsInside = (pathname, otherPathname) => {
  return pathname.startsWith(`${otherPathname}/`)
}

export const pathnameToRelativePathname = (pathname, otherPathname) => {
  return pathname.slice(otherPathname.length)
}

const replaceSlashWithBackSlash = (string) => string.replace(/\//g, "\\")

const replaceBackSlashWithSlash = (string) => string.replace(/\\/g, "/")

export const isWindowsPath = (path) => startsWithWindowsDriveLetter(path) && path[2] === "\\"

export const windowPathToPathnameWithoutDriveLetter = (windowsPath) => {
  return replaceBackSlashWithSlash(windowsPath.slice(2))
}

const startsWithWindowsDriveLetter = (string) => {
  const firstChar = string[0]
  if (!/[a-zA-Z]/.test(firstChar)) return false

  const secondChar = string[1]
  if (secondChar !== ":") return false

  return true
}
