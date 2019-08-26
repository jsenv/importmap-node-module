import { extname } from "path"
import { stat } from "fs"
import { firstOperationMatching } from "@dmail/helper"
import { pathnameToOperatingSystemPath } from "@jsenv/operating-system-path"
import { pathnameToDirname } from "@jsenv/module-resolution"

export const resolvePackageMain = (packageData, packagePathname) => {
  if ("module" in packageData) return resolveMainFile(packageData.module, packagePathname)
  if ("jsnext:main" in packageData)
    return resolveMainFile(packageData["jsnext:main"], packagePathname)
  if ("main" in packageData) return resolveMainFile(packageData.main, packagePathname)
  return resolveMainFile("index", packagePathname)
}

const extensionCandidateArray = ["js", "json", "node"]

const resolveMainFile = async (main, packagePathname) => {
  if (main.slice(0, 2) === "./") main = main.slice(2)
  if (main[0] === "/") main = main.slice(1)

  const extension = extname(main)
  if (extension === "") {
    const extensionLeadingToFile = await firstOperationMatching({
      array: extensionCandidateArray,
      start: async (extensionCandidate) => {
        const packageDirname = pathnameToDirname(packagePathname)
        const path = pathnameToOperatingSystemPath(
          `${packageDirname}/${main}.${extensionCandidate}`,
        )
        const isFile = await pathLeadsToAFile(path)
        return isFile ? extensionCandidate : null
      },
      predicate: (extension) => Boolean(extension),
    })
    if (extensionLeadingToFile) return `${main}.${extensionLeadingToFile}`
    // we know in advance this remapping does not lead to an actual file.
    // however we have no guarantee this remapping will actually be used
    // in the codebase.
    return `${main}.js`
  }

  return main
}

const pathLeadsToAFile = (path) => {
  return new Promise((resolve, reject) => {
    stat(path, (error, statObject) => {
      if (error) {
        if (error.code === "ENOENT") resolve(false)
        else reject(error)
      } else {
        resolve(statObject.isFile())
      }
    })
  })
}
