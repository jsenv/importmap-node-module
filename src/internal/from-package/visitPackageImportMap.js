import { resolveUrl, moveImportMap } from "@jsenv/importmap"
import { readFile, urlToFileSystemPath } from "@jsenv/filesystem"

export const visitPackageImportMap = async ({
  warn,
  packageFileUrl,
  packageJsonObject,
  packageImportmap = packageJsonObject.importmap,
  projectDirectoryUrl,
}) => {
  if (typeof packageImportmap === "undefined") {
    return {}
  }

  if (typeof packageImportmap === "string") {
    const importmapFileUrl = resolveUrl(packageImportmap, packageFileUrl)
    try {
      const importmap = await readFile(importmapFileUrl, { as: "json" })
      return moveImportMap(importmap, importmapFileUrl, projectDirectoryUrl)
    } catch (e) {
      if (e.code === "ENOENT") {
        warn(
          createPackageImportMapNotFoundWarning({
            importmapFileUrl,
            packageFileUrl,
          }),
        )
        return {}
      }
      throw e
    }
  }

  if (typeof packageImportmap === "object" && packageImportmap !== null) {
    return packageImportmap
  }

  warn(
    createPackageImportMapUnexpectedWarning({
      packageImportmap,
      packageFileUrl,
    }),
  )
  return {}
}

const createPackageImportMapNotFoundWarning = ({
  importmapFileUrl,
  packageFileUrl,
}) => {
  return {
    code: "PACKAGE_IMPORTMAP_NOT_FOUND",
    message: `importmap file specified in a package.json cannot be found,
--- importmap file path ---
${importmapFileUrl}
--- package.json path ---
${packageFileUrl}`,
  }
}

const createPackageImportMapUnexpectedWarning = ({
  packageImportmap,
  packageFileUrl,
}) => {
  return {
    code: "PACKAGE_IMPORTMAP_UNEXPECTED",
    message: `unexpected value in package.json importmap field: value must be a string or an object.
--- value ---
${packageImportmap}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`,
  }
}
