import { resolveUrl, moveImportMap } from "@jsenv/import-map"
import { readFile, urlToFileSystemPath } from "@jsenv/util"

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
    const importmap = await readFile(importmapFileUrl, { as: "json" })
    return moveImportMap(importmap, importmapFileUrl, projectDirectoryUrl)
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

const createPackageImportMapUnexpectedWarning = ({ packageImportmap, packageFileUrl }) => {
  return {
    code: "PACKAGE_IMPORTMAP_UNEXPECTED",
    message: `unexpected value in package.json importmap field: value must be a string or an object.
--- value ---
${packageImportmap}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}`,
  }
}
