import { hasScheme, urlToFilePath } from "./urlUtils.js"

export const normalizeDirectoryUrl = (value, name = "projectDirectoryUrl") => {
  if (value instanceof URL) {
    value = value.href
  }

  if (typeof value === "string") {
    const url = hasScheme(value) ? value : urlToFilePath(value)

    if (!url.startsWith("file://")) {
      throw new Error(`${name} must starts with file://, received ${value}`)
    }

    return ensureTrailingSlash(value)
  }

  throw new TypeError(`${name} must be a string or an url, received ${value}`)
}

const ensureTrailingSlash = (string) => {
  return string.endsWith("/") ? string : `${string}/`
}
