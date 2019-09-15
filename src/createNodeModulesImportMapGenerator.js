import { basename } from "path"
import {
  operatingSystemPathToPathname,
  pathnameToRelativePathname,
  pathnameToOperatingSystemPath,
} from "@jsenv/operating-system-path"
import { sortImportMap } from "@jsenv/import-map"
import { pathnameToDirname } from "./pathnameToDirname.js"
import {
  readPackageData,
  resolveNodeModule,
  resolvePackageMain,
} from "./node-module-resolution/index.js"

export const createNodeModulesImportMapGenerator = async ({
  projectPath,
  rootProjectPath = projectPath,
  onWarn = ({ message }) => {
    console.warn(message)
  },
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

  const generateImportMapForProject = async ({ includeDevDependencies = false } = {}) => {
    const projectPackageData = await readPackageData({
      path: pathnameToOperatingSystemPath(projectPackagePathname),
      onWarn,
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

  const generateImportMapForProjectDependency = async ({
    dependencyName,
    dependencyType = "dependency",
    dependencyVersionPattern = "*",
  }) => {
    const projectPackageData = await readPackageData({
      path: pathnameToOperatingSystemPath(projectPackagePathname),
      onWarn,
    })
    markPackageAsSeen(projectPackagePathname, projectPackagePathname)

    // we must visit package too because it may contain
    // exports or stuff like that that we may expect in the importMap
    // I guess so
    await visitPackage({
      packagePathname: projectPackagePathname,
      packageData: projectPackageData,
      packageName: projectPackageData.name,
      importerPackagePathname: projectPackagePathname,
    })
    await visitDependency({
      packagePathname: projectPackagePathname,
      packageData: projectPackageData,
      dependencyName,
      dependencyType,
      dependencyVersionPattern,
    })
    return sortImportMap({ imports, scopes })
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
      visitPackageImports({
        packagePathname,
        packageName,
        packageData,
        packagePathInfo,
      })
    }

    if ("exports" in packageData) {
      visitPackageExports({
        packagePathname,
        packageName,
        packageData,
        packagePathInfo,
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

    const main = await resolvePackageMain({
      packagePathname,
      packageData,
      onWarn: () => {},
    })

    // it's possible to have no main
    // like { main: "" } in package.json
    // or a main that does not lead to an actual file
    if (!main) return

    const from = packageName
    const to = `${actualRelativePath}/${main}`

    if (importerPackageIsRoot) {
      addImportMapping({ from, to })
    } else {
      addScopedImportMapping({ scope: `/${importerName}/`, from, to })
    }
    if (actualRelativePath !== expectedRelativePath) {
      addScopedImportMapping({ scope: `/${importerName}/`, from, to })
    }
  }

  const visitPackageImports = ({ packagePathname, packageData, packagePathInfo }) => {
    const { imports: packageImports } = packageData
    if (typeof packageImports !== "object" || packageImports === null) {
      onWarn(
        createUnexpectedPackageImportsWarning({
          packageImports,
          packagePathname,
        }),
      )
      return
    }

    const { packageIsRoot, actualRelativePath } = packagePathInfo

    Object.keys(packageImports).forEach((key) => {
      const resolvedKey = resolvePathInPackage(key, packagePathname)
      if (!resolvedKey) return
      const resolvedValue = resolvePathInPackage(packageImports[key], packagePathname)
      if (!resolvedValue) return

      if (packageIsRoot) {
        addImportMapping({
          from: resolvedKey,
          to: resolvedValue,
        })
      } else {
        addScopedImportMapping({
          scope: `${actualRelativePath}/`,
          from: resolvedKey,
          to: `${actualRelativePath}${resolvedValue}`,
        })
      }
    })

    if (!packageIsRoot) {
      // ensureImportsScopedInsidePackage
      addScopedImportMapping({
        scope: `${actualRelativePath}/`,
        from: `${actualRelativePath}/`,
        to: `${actualRelativePath}/`,
      })
    }
  }

  const visitPackageExports = ({
    packagePathname,
    packageName,
    packageData,
    packagePathInfo: { importerName, packageIsRoot, actualRelativePath, expectedRelativePath },
  }) => {
    if (packageIsRoot) return

    const { exports: packageExports } = packageData
    if (typeof packageExports !== "object" || packageExports === null) {
      onWarn(
        createUnexpectedPackageExportsWarning({
          packageExports,
          packagePathname,
        }),
      )
      return
    }

    Object.keys(packageExports).forEach((key) => {
      const resolvedKey = resolvePathInPackage(key, packagePathname)
      if (!resolvedKey) return
      const resolvedValue = resolvePathInPackage(packageExports[key], packagePathname)
      if (!resolvedValue) return
      const from = `${packageName}${resolvedKey}`
      const to = `${actualRelativePath}${resolvedValue}`

      if (importerName === rootImporterName) {
        addImportMapping({ from, to })
      } else {
        addScopedImportMapping({ scope: `/${importerName}/`, from, to })
      }
      if (actualRelativePath !== expectedRelativePath) {
        addScopedImportMapping({
          scope: `/${importerName}/`,
          from,
          to,
        })
      }
    })
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

  const resolvePathInPackage = (path, packagePathname) => {
    if (path[0] === "/") return path
    if (path.slice(0, 2) === "./") return path.slice(1)
    onWarn(
      createInvalidPackageRelativePathWarning({
        path,
        packagePathname,
      }),
    )
    return ""
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
      onWarn,
    })
    dependenciesCache[packagePathname][dependencyName] = dependencyPromise
    return dependencyPromise
  }

  return { generateImportMapForProject, generateImportMapForProjectDependency }
}

const createInvalidPackageRelativePathWarning = ({ path, packagePathname }) => {
  return {
    code: "INVALID_PATH_RELATIVE_TO_PACKAGE",
    message: `
invalid path relative to package.
--- path ---
${path}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`,
    data: { packagePathname, path },
  }
}

const createUnexpectedPackageImportsWarning = ({ packageImports, packagePathname }) => {
  return {
    code: "UNEXPECTED_PACKAGE_IMPORTS",
    message: `
package.imports must be an object.
--- package.json imports ---
${packageImports}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`,
    data: { packagePathname, packageImports },
  }
}

const createUnexpectedPackageExportsWarning = ({ packageExports, packagePathname }) => {
  return {
    code: "UNEXPECTED_PACKAGE_EXPORTS",
    message: `
package.exports must be an object.
--- package.json exports ---
${packageExports}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`,
    data: { packagePathname, packageExports },
  }
}
