import { extname } from "path"
import { stat } from "fs"
import { firstOperationMatching } from "@dmail/helper"
import { pathnameToOperatingSystemPath } from "@jsenv/operating-system-path"
import { pathnameToDirname } from "../pathnameToDirname.js"

export const resolvePackageMain = ({ packageData, packagePathname, onWarn }) => {
  if ("module" in packageData) {
    return resolveMainFile({
      from: "module",
      main: packageData.module,
      packagePathname,
      onWarn,
    })
  }

  if ("jsnext:main" in packageData) {
    return resolveMainFile({
      from: "jsnext:main",
      main: packageData["jsnext:main"],
      packagePathname,
      onWarn,
    })
  }

  if ("main" in packageData) {
    return resolveMainFile({
      from: "main",
      main: packageData.main,
      packagePathname,
      onWarn,
    })
  }

  return resolveMainFile({
    from: "default",
    main: "index",
    packagePathname,
    onWarn,
  })
}

const extensionCandidateArray = ["js", "json", "node"]

const resolveMainFile = async ({ main, packagePathname, onWarn }) => {
  // main is explicitely empty meaning
  // it is assumed that we should not find a file
  if (main === "") return ""

  if (main.slice(0, 2) === "./") main = main.slice(2)
  if (main[0] === "/") main = main.slice(1)

  const packageDirname = pathnameToDirname(packagePathname)
  const extension = extname(main)

  if (extension === "") {
    const fileWithoutExtensionPathname = `${packageDirname}/${main}`

    const extensionLeadingToFile = await firstOperationMatching({
      array: extensionCandidateArray,
      start: async (extensionCandidate) => {
        const path = pathnameToOperatingSystemPath(
          `${fileWithoutExtensionPathname}.${extensionCandidate}`,
        )
        const isFile = await pathLeadsToAFile(path)
        return isFile ? extensionCandidate : null
      },
      predicate: (extension) => Boolean(extension),
    })
    if (extensionLeadingToFile) return `${main}.${extensionLeadingToFile}`

    onWarn({
      code: "MAIN_FILE_NOT_FOUND",
      message: createMainFileNotFoundMessage({
        mainPathname: fileWithoutExtensionPathname,
        packagePathname,
      }),
      data: { main, packagePathname },
    })

    return `${main}.js`
  }

  const mainPathname = `${packageDirname}/${main}`
  const isFile = await pathLeadsToAFile(mainPathname)
  if (!isFile) {
    onWarn({
      code: "MAIN_FILE_NOT_FOUND",
      message: createMainFileNotFoundMessage({
        mainPathname,
        packagePathname,
      }),
      data: { main, packagePathname },
    })
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

// we know in advance this remapping does not lead to an actual file.
// we only warn because we have no guarantee this remapping will actually be used
// in the codebase.
const createMainFileNotFoundMessage = ({
  mainPathname,
  packagePathname,
}) => `cannot find a module main file.
--- extensions tried ---
${extensionCandidateArray.join(",")}
--- main path ---
${pathnameToOperatingSystemPath(mainPathname)}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}`
