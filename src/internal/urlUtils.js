import { pathToFileURL, fileURLToPath } from "url"

export const resolveUrl = (value, baseUrl) => {
  return String(new URL(value, baseUrl))
}

export const filePathToUrl = (path) => {
  return String(pathToFileURL(path))
}

export const urlToFilePath = (url) => {
  return fileURLToPath(url)
}

export const hasScheme = (string) => {
  return /^[a-zA-Z]{2,}:/.test(string)
}

export const urlToRelativeUrl = (url, baseUrl) => {
  if (typeof baseUrl !== "string") {
    throw new TypeError(`baseUrl must be a string, got ${baseUrl}`)
  }
  if (url.startsWith(baseUrl)) {
    // we should take into account only pathname
    // and ignore search params
    return url.slice(baseUrl.length)
  }
  return url
}
