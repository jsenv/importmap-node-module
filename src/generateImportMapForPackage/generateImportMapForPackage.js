/* eslint-disable import/max-dependencies */
import { basename } from "path"
import {
  operatingSystemPathToPathname,
  pathnameToRelativePathname,
  pathnameToOperatingSystemPath,
} from "@jsenv/operating-system-path"
import { sortImportMap } from "@jsenv/import-map"
import { pathnameToDirname } from "./pathnameToDirname.js"
import { readPackageData } from "./readPackageData.js"
import { resolveNodeModule } from "./resolveNodeModule.js"
import { resolvePackageMain } from "./resolvePackageMain.js"
import { visitPackageImports } from "./visitPackageImports.js"
import { visitPackageExports } from "./visitPackageExports.js"

export const generateImportMapForPackage = async ({
  projectPath,
  rootProjectPath = projectPath,
  includeDevDependencies = false,
  logger,
}) => {
  const projectPathname = operatingSystemPathToPathname(projectPath)
  const projectPackagePathname = `${projectPathname}/package.json`
  const rootProjectPathname = operatingSystemPathToPathname(rootProjectPath)
  const rootImporterName = basename(rootProjectPathname)
  const rootPackagePathname = `${rootProjectPathname}/package.json`

  const imports = {}
  const scopes = {}
  const seen = {}

  const markPackageAsSeen = (packagePathname, importerPackagePathname) => {
    if (packagePathname in seen) {
      seen[packagePathname].push(importerPackagePathname)
    } else {
      seen[packagePathname] = [importerPackagePathname]
    }
  }

  const packageIsSeen = (packagePathname, importerPackagePathname) => {
    return packagePathname in seen && seen[packagePathname].includes(importerPackagePathname)
  }

  const visit = async ({
    packagePathname,
    packageData,
    includeDevDependencies,
    packageName,
    importerPackagePathname,
  }) => {
    await visitPackage({
      packagePathname,
      packageData,
      packageName,
      importerPackagePathname,
    })
    await visitDependencies({
      packagePathname,
      packageData,
      includeDevDependencies,
    })
  }

  const visitPackage = async ({
    packagePathname,
    packageData,
    packageName,
    importerPackagePathname,
  }) => {
    const packagePathInfo = computePackagePathInfo({
      packagePathname,
      packageName,
      importerPackagePathname,
    })

    await visitPackageMain({
      packagePathname,
      packageName,
      packageData,
      packagePathInfo,
    })

    if ("imports" in packageData) {
      const importsForPackageImports = visitPackageImports({
        packagePathname,
        packageName,
        packageData,
        packagePathInfo,
      })

      const { packageIsRoot, actualRelativePath } = packagePathInfo
      Object.keys(importsForPackageImports).forEach((from) => {
        const to = importsForPackageImports[from]

        if (packageIsRoot) {
          addImportMapping({ from, to })
        } else {
          addScopedImportMapping({
            scope: `.${actualRelativePath}/`,
            from,
            to: to[0] === "/" ? to : `.${actualRelativePath}${to}`,
          })
        }
      })

      // if (`./` in packageImports && packageImports["./"] === "./" && !packageIsRoot) {
      //   addScopedImportMapping({
      //     scope: `.${actualRelativePath}/`,
      //     from: `.${actualRelativePath}/`,
      //     to: `.${actualRelativePath}/`,
      //   })
      // }
      // if (`/` in packageImports && packageImports["/"] === "/" && !packageIsRoot) {
      //   addScopedImportMapping({
      //     scope: `.${actualRelativePath}/`,
      //     from: `${actualRelativePath}/`,
      //     to: `${actualRelativePath}/`,
      //   })
      // }
    }

    if ("exports" in packageData) {
      const importsForPackageExports = visitPackageExports({
        packagePathname,
        packageName,
        packageData,
        packagePathInfo,
      })

      const { importerName, actualRelativePath, expectedRelativePath } = packagePathInfo
      Object.keys(importsForPackageExports).forEach((from) => {
        const to = importsForPackageExports[from]

        if (importerName === rootImporterName) {
          addImportMapping({ from, to })
        } else {
          addScopedImportMapping({ scope: `./${importerName}/`, from, to })
        }
        if (actualRelativePath !== expectedRelativePath) {
          addScopedImportMapping({
            scope: `./${importerName}/`,
            from,
            to,
          })
        }
      })
    }
  }

  const visitPackageMain = async ({
    packagePathname,
    packageData,
    packageName,
    packagePathInfo: {
      packageIsRoot,
      packageIsProject,
      importerPackageIsRoot,
      importerName,
      actualRelativePath,
      expectedRelativePath,
    },
  }) => {
    if (packageIsRoot) return
    if (packageIsProject) return

    const mainRelativePath = await resolvePackageMain({
      packagePathname,
      packageData,
      logger,
    })

    // it's possible to have no main
    // like { main: "" } in package.json
    // or a main that does not lead to an actual file
    if (!mainRelativePath) return

    const from = packageName
    const to = `.${actualRelativePath}${mainRelativePath}`

    if (importerPackageIsRoot) {
      addImportMapping({ from, to })
    } else {
      addScopedImportMapping({ scope: `./${importerName}/`, from, to })
    }
    if (actualRelativePath !== expectedRelativePath) {
      addScopedImportMapping({ scope: `./${importerName}/`, from, to })
    }
  }

  const visitDependencies = async ({ packagePathname, packageData, includeDevDependencies }) => {
    const dependencyMap = {}

    const { dependencies = {} } = packageData
    Object.keys(dependencies).forEach((dependencyName) => {
      dependencyMap[dependencyName] = {
        type: "dependency",
        versionPattern: dependencies[dependencyName],
      }
    })

    const { peerDependencies = {} } = packageData
    Object.keys(peerDependencies).forEach((dependencyName) => {
      dependencyMap[dependencyName] = {
        type: "peerDependency",
        versionPattern: peerDependencies[dependencyName],
      }
    })

    const isProjectPackage = packagePathname === projectPackagePathname
    if (includeDevDependencies && isProjectPackage) {
      const { devDependencies = {} } = packageData
      Object.keys(devDependencies).forEach((dependencyName) => {
        if (!dependencyMap.hasOwnProperty(dependencyName)) {
          dependencyMap[dependencyName] = {
            type: "devDependency",
            versionPattern: devDependencies[dependencyName],
          }
        }
      })
    }

    await Promise.all(
      Object.keys(dependencyMap).map(async (dependencyName) => {
        const dependency = dependencyMap[dependencyName]
        await visitDependency({
          packagePathname,
          packageData,
          dependencyName,
          dependencyType: dependency.type,
          dependencyVersionPattern: dependency.versionPattern,
        })
      }),
    )
  }

  const visitDependency = async ({
    packagePathname,
    packageData,
    dependencyName,
    dependencyType,
    dependencyVersionPattern,
  }) => {
    const dependencyData = await findDependency({
      packagePathname,
      packageData,
      dependencyName,
      dependencyType,
      dependencyVersionPattern,
    })
    if (!dependencyData) {
      return
    }

    const {
      packagePathname: dependencyPackagePathname,
      packageData: dependencyPackageData,
    } = dependencyData

    if (packageIsSeen(dependencyPackagePathname, packagePathname)) {
      return
    }
    markPackageAsSeen(dependencyPackagePathname, packagePathname)
    await visit({
      packagePathname: dependencyPackagePathname,
      packageData: dependencyPackageData,
      packageName: dependencyName,
      importerPackagePathname: packagePathname,
    })
  }

  const computePackagePathInfo = ({ packagePathname, packageName, importerPackagePathname }) => {
    const packageIsRoot = packagePathname === rootPackagePathname

    const packageIsProject = packagePathname === projectPackagePathname

    const importerPackageIsRoot = importerPackagePathname === rootPackagePathname

    const importerPackageIsProject = importerPackagePathname === projectPackagePathname

    const importerName = importerPackageIsRoot
      ? rootImporterName
      : pathnameToDirname(
          pathnameToRelativePathname(importerPackagePathname, rootProjectPathname),
        ).slice(1)

    const actualPathname = pathnameToDirname(packagePathname)
    const actualRelativePath = pathnameToRelativePathname(actualPathname, rootProjectPathname)
    let expectedPathname
    if (packageIsProject && !packageIsRoot) {
      expectedPathname = pathnameToDirname(importerPackagePathname)
    } else {
      expectedPathname = `${pathnameToDirname(importerPackagePathname)}/node_modules/${packageName}`
    }
    const expectedRelativePath = pathnameToRelativePathname(expectedPathname, rootProjectPathname)

    return {
      importerPackageIsRoot,
      importerPackageIsProject,
      importerName,
      packageIsRoot,
      packageIsProject,
      actualRelativePath,
      expectedRelativePath,
    }
  }

  const addImportMapping = ({ from, to }) => {
    // we could think it's useless to remap from with to
    // however it can be used to ensure a weaker remapping
    // does not win over this specific file or folder
    if (from === to) {
      /**
       * however remapping '/' to '/' is truly useless
       * moreover it would make wrapImportMap create something like
       * {
       *   imports: {
       *     "/": "/.dist/best/"
       *   }
       * }
       * that would append the wrapped folder twice
       * */
      if (from === "/") return
    }

    imports[from] = to
  }

  const addScopedImportMapping = ({ scope, from, to }) => {
    scopes[scope] = {
      ...(scopes[scope] || {}),
      [from]: to,
    }
  }

  const dependenciesCache = {}
  const findDependency = ({
    packagePathname,
    packageData,
    dependencyName,
    dependencyType,
    dependencyVersionPattern,
  }) => {
    if (packagePathname in dependenciesCache === false) {
      dependenciesCache[packagePathname] = {}
    }
    if (dependencyName in dependenciesCache[packagePathname]) {
      return dependenciesCache[packagePathname][dependencyName]
    }
    const dependencyPromise = resolveNodeModule({
      rootPathname: rootProjectPathname,
      packagePathname,
      packageData,
      dependencyName,
      dependencyType,
      dependencyVersionPattern,
      logger,
    })
    dependenciesCache[packagePathname][dependencyName] = dependencyPromise
    return dependencyPromise
  }

  const projectPackageData = await readPackageData({
    path: pathnameToOperatingSystemPath(projectPackagePathname),
  })
  markPackageAsSeen(projectPackagePathname, projectPackagePathname)
  await visit({
    packagePathname: projectPackagePathname,
    packageData: projectPackageData,
    includeDevDependencies,
    packageName: projectPackageData.name,
    importerPackagePathname: projectPackagePathname,
  })

  return sortImportMap({ imports, scopes })
}
