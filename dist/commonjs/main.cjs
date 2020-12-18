'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var logger = require('@jsenv/logger');
var importMap = require('@jsenv/import-map');
var util = require('@jsenv/util');
var cancellation = require('@jsenv/cancellation');
var path = require('path');

const readPackageFile = async (packageFileUrl, packagesManualOverrides) => {
  const packageFileString = await util.readFile(packageFileUrl);
  const packageJsonObject = JSON.parse(packageFileString);
  const {
    name,
    version
  } = packageJsonObject;
  const overrideKey = Object.keys(packagesManualOverrides).find(overrideKeyCandidate => {
    if (name === overrideKeyCandidate) return true;
    if (`${name}@${version}` === overrideKeyCandidate) return true;
    return false;
  });

  if (overrideKey) {
    return composeObject(packageJsonObject, packagesManualOverrides[overrideKey]);
  }

  return packageJsonObject;
};

const composeObject = (leftObject, rightObject) => {
  const composedObject = { ...leftObject
  };
  Object.keys(rightObject).forEach(key => {
    const rightValue = rightObject[key];

    if (rightValue === null || typeof rightValue !== "object" || key in leftObject === false) {
      composedObject[key] = rightValue;
    } else {
      const leftValue = leftObject[key];

      if (leftValue === null || typeof leftValue !== "object") {
        composedObject[key] = rightValue;
      } else {
        composedObject[key] = composeObject(leftValue, rightValue);
      }
    }
  });
  return composedObject;
};

const resolveNodeModule = async ({
  logger,
  rootProjectDirectoryUrl,
  packagesManualOverrides,
  packageFileUrl,
  dependencyName
}) => {
  const packageDirectoryUrl = util.resolveUrl("./", packageFileUrl);
  const nodeModuleCandidateArray = [...computeNodeModuleCandidateArray(packageDirectoryUrl, rootProjectDirectoryUrl), `node_modules/`];
  return cancellation.firstOperationMatching({
    array: nodeModuleCandidateArray,
    start: async nodeModuleCandidate => {
      const packageFileUrl = `${rootProjectDirectoryUrl}${nodeModuleCandidate}${dependencyName}/package.json`;

      try {
        const packageJsonObject = await readPackageFile(packageFileUrl, packagesManualOverrides);
        return {
          packageFileUrl,
          packageJsonObject
        };
      } catch (e) {
        if (e.code === "ENOENT") {
          return {};
        }

        if (e.name === "SyntaxError") {
          logger.error(`
error while parsing dependency package.json.
--- parsing error message ---
${e.message}
--- package.json path ---
${util.urlToFileSystemPath(packageFileUrl)}
`);
          return {};
        }

        throw e;
      }
    },
    predicate: ({
      packageJsonObject
    }) => Boolean(packageJsonObject)
  });
};

const computeNodeModuleCandidateArray = (packageDirectoryUrl, rootProjectDirectoryUrl) => {
  if (packageDirectoryUrl === rootProjectDirectoryUrl) {
    return [];
  }

  const packageDirectoryRelativeUrl = util.urlToRelativeUrl(packageDirectoryUrl, rootProjectDirectoryUrl);
  const candidateArray = [];
  const relativeNodeModuleDirectoryArray = packageDirectoryRelativeUrl.split("node_modules/"); // remove the first empty string

  relativeNodeModuleDirectoryArray.shift();
  let i = relativeNodeModuleDirectoryArray.length;

  while (i--) {
    candidateArray.push(`node_modules/${relativeNodeModuleDirectoryArray.slice(0, i + 1).join("node_modules/")}node_modules/`);
  }

  return candidateArray;
};

const resolvePackageMain = ({
  logger,
  packageFileUrl,
  packageJsonObject
}) => {
  if ("module" in packageJsonObject) {
    return resolveMainFile({
      logger,
      packageFileUrl,
      packageMainFieldName: "module",
      packageMainFieldValue: packageJsonObject.module
    });
  }

  if ("jsnext:main" in packageJsonObject) {
    return resolveMainFile({
      logger,
      packageFileUrl,
      packageMainFieldName: "jsnext:main",
      packageMainFieldValue: packageJsonObject["jsnext:main"]
    });
  }

  if ("main" in packageJsonObject) {
    return resolveMainFile({
      logger,
      packageFileUrl,
      packageMainFieldName: "main",
      packageMainFieldValue: packageJsonObject.main
    });
  }

  return resolveMainFile({
    logger,
    packageFileUrl,
    packageMainFieldName: "default",
    packageMainFieldValue: "index"
  });
};
const extensionCandidateArray = ["js", "json", "node"];

const resolveMainFile = async ({
  logger,
  packageFileUrl,
  packageMainFieldName,
  packageMainFieldValue
}) => {
  // main is explicitely empty meaning
  // it is assumed that we should not find a file
  if (packageMainFieldValue === "") {
    return null;
  }

  const packageFilePath = util.urlToFileSystemPath(packageFileUrl);
  const packageDirectoryUrl = util.resolveUrl("./", packageFileUrl);
  const mainFileRelativeUrl = packageMainFieldValue.endsWith("/") ? `${packageMainFieldValue}index` : packageMainFieldValue;
  const mainFileUrlFirstCandidate = util.resolveUrl(mainFileRelativeUrl, packageFileUrl);

  if (!mainFileUrlFirstCandidate.startsWith(packageDirectoryUrl)) {
    logger.warn(`
${packageMainFieldName} field in package.json must be inside package.json folder.
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- package.json path ---
${packageFilePath}
`);
    return null;
  }

  const mainFileUrl = await findMainFileUrlOrNull(mainFileUrlFirstCandidate);

  if (mainFileUrl === null) {
    // we know in advance this remapping does not lead to an actual file.
    // we only warn because we have no guarantee this remapping will actually be used
    // in the codebase.
    // warn only if there is actually a main field
    // otherwise the package.json is missing the main field
    // it certainly means it's not important
    if (packageMainFieldName !== "default") {
      const extensionTried = path.extname(util.urlToFileSystemPath(mainFileUrlFirstCandidate)) === "" ? `--- extensions tried ---
${extensionCandidateArray.join(`,`)}
` : `
`;
      logger.warn(`
cannot find file for package.json ${packageMainFieldName} field
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- file path ---
${util.urlToFileSystemPath(mainFileUrlFirstCandidate)}
--- package.json path ---
${packageFilePath}
${extensionTried}`);
    }

    return mainFileUrlFirstCandidate;
  }

  return mainFileUrl;
};

const findMainFileUrlOrNull = async mainFileUrl => {
  const mainStats = await util.readFileSystemNodeStat(mainFileUrl, {
    nullIfNotFound: true
  });

  if (mainStats && mainStats.isFile()) {
    return mainFileUrl;
  }

  if (mainStats && mainStats.isDirectory()) {
    const indexFileUrl = util.resolveUrl("./index", mainFileUrl.endsWith("/") ? mainFileUrl : `${mainFileUrl}/`);
    const extensionLeadingToAFile = await findExtension(indexFileUrl);

    if (extensionLeadingToAFile === null) {
      return null;
    }

    return `${indexFileUrl}.${extensionLeadingToAFile}`;
  }

  const mainFilePath = util.urlToFileSystemPath(mainFileUrl);
  const extension = path.extname(mainFilePath);

  if (extension === "") {
    const extensionLeadingToAFile = await findExtension(mainFileUrl);

    if (extensionLeadingToAFile === null) {
      return null;
    }

    return `${mainFileUrl}.${extensionLeadingToAFile}`;
  }

  return null;
};

const findExtension = async fileUrl => {
  const filePath = util.urlToFileSystemPath(fileUrl);
  const fileDirname = path.dirname(filePath);
  const fileBasename = path.basename(filePath);
  const extensionLeadingToFile = await cancellation.firstOperationMatching({
    array: extensionCandidateArray,
    start: async extensionCandidate => {
      const filePathCandidate = `${fileDirname}/${fileBasename}.${extensionCandidate}`;
      const stats = await util.readFileSystemNodeStat(filePathCandidate, {
        nullIfNotFound: true
      });
      return stats && stats.isFile() ? extensionCandidate : null;
    },
    predicate: extension => Boolean(extension)
  });
  return extensionLeadingToFile || null;
};

const specifierIsRelative = specifier => {
  if (specifier.startsWith("//")) {
    return false;
  }

  if (specifier.startsWith("../")) {
    return false;
  } // starts with http:// or file:// or ftp: for instance


  if (/^[a-zA-Z]+\:/.test(specifier)) {
    return false;
  }

  return true;
};

const visitPackageImports = ({
  logger,
  packageFileUrl,
  packageJsonObject
}) => {
  const importsForPackageImports = {};
  const packageFilePath = util.urlToFileSystemPath(packageFileUrl);
  const {
    imports: packageImports
  } = packageJsonObject;

  if (typeof packageImports !== "object" || packageImports === null) {
    logger.warn(`
imports of package.json must be an object.
--- package.json imports ---
${packageImports}
--- package.json path ---
${packageFilePath}
`);
    return importsForPackageImports;
  }

  Object.keys(packageImports).forEach(specifier => {
    if (!specifierIsRelative(specifier)) {
      logger.warn(`
found unexpected specifier in imports of package.json, it must be relative to package.json.
--- specifier ---
${specifier}
--- package.json path ---
${packageFilePath}
`);
      return;
    }

    const address = packageImports[specifier];

    if (typeof address !== "string") {
      logger.warn(`
found unexpected address in imports of package.json, it must be a string.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${packageFilePath}
`);
      return;
    }

    if (!specifierIsRelative(address)) {
      logger.warn(`
found unexpected address in imports of package.json, it must be relative to package.json.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${packageFilePath}
`);
      return;
    }

    let from;

    if (specifier[0] === "/") {
      from = specifier;
    } else if (specifier.startsWith("./")) {
      from = specifier;
    } else {
      from = specifier;
    }

    const to = address;
    importsForPackageImports[from] = to;
  });
  return importsForPackageImports;
};

// https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_package_exports
const visitPackageExports = ({
  logger,
  packageFileUrl,
  packageName,
  packageJsonObject,
  packageInfo: {
    packageDirectoryRelativeUrl
  },
  packagesExportsPreference
}) => {
  const importsForPackageExports = {};
  const packageFilePath = util.urlToFileSystemPath(packageFileUrl);
  const {
    exports: packageExports
  } = packageJsonObject; // false is allowed as laternative to exports: {}

  if (packageExports === false) {
    return importsForPackageExports;
  }

  const addressToDestination = address => {
    if (address[0] === "/") {
      return address;
    }

    if (address.startsWith("./")) {
      return `./${packageDirectoryRelativeUrl}${address.slice(2)}`;
    }

    return `./${packageDirectoryRelativeUrl}${address}`;
  }; // exports used to indicate the main file


  if (typeof packageExports === "string") {
    const from = packageName;
    const to = addressToDestination(packageExports);
    importsForPackageExports[from] = to;
    return importsForPackageExports;
  }

  if (typeof packageExports !== "object" || packageExports === null) {
    logger.warn(`
exports of package.json must be an object.
--- package.json exports ---
${packageExports}
--- package.json path ---
${packageFilePath}
`);
    return importsForPackageExports;
  }

  const packageExportsKeys = Object.keys(packageExports);
  const someSpecifierStartsWithDot = packageExportsKeys.some(key => key.startsWith("."));

  if (someSpecifierStartsWithDot) {
    const someSpecifierDoesNotStartsWithDot = packageExportsKeys.some(key => !key.startsWith("."));

    if (someSpecifierDoesNotStartsWithDot) {
      // see https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_exports_sugar
      logger.error(`
exports of package.json mixes conditional exports and direct exports.
--- package.json path ---
${packageFilePath}
`);
      return importsForPackageExports;
    }
  }

  packageExportsKeys.forEach(specifier => {
    if (!specifierIsRelative(specifier)) {
      logger.warn(`
found unexpected specifier in exports of package.json, it must be relative to package.json.
--- specifier ---
${specifier}
--- package.json path ---
${packageFilePath}
`);
      return;
    }

    const value = packageExports[specifier];
    let address;

    if (typeof value === "object") {
      address = readFavoredKey(value, packagesExportsPreference);

      if (!address) {
        return;
      }

      if (typeof address === "object") {
        address = readFavoredKey(address, packagesExportsPreference);

        if (!address) {
          return;
        }
      }
    } else if (typeof value === "string") {
      address = value;
    } else {
      logger.warn(`
found unexpected address in exports of package.json, it must be a string.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${packageFilePath}
`);
      return;
    }

    if (!specifierIsRelative(address)) {
      logger.warn(`
found unexpected address in exports of package.json, it must be relative to package.json.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${packageFilePath}
`);
      return;
    }

    let from;

    if (specifier === ".") {
      from = packageName;
    } else if (specifier[0] === "/") {
      from = specifier;
    } else if (specifier.startsWith("./")) {
      from = `${packageName}${specifier.slice(1)}`;
    } else {
      from = `${packageName}/${specifier}`;
    }

    const to = addressToDestination(address);
    importsForPackageExports[from] = to;
  });
  return importsForPackageExports;
};

const readFavoredKey = (object, favoredKeys) => {
  const favoredKey = favoredKeys.find(key => object.hasOwnProperty(key));

  if (favoredKey) {
    return object[favoredKey];
  }

  if (object.hasOwnProperty("default")) {
    return object.default;
  }

  return undefined;
};

const getImportMapFromNodeModules = async ({
  // nothing is actually listening for this cancellationToken for now
  // it's not very important but it would be better to register on it
  // an stops what we are doing if asked to do so
  // cancellationToken = createCancellationTokenForProcess(),
  logLevel,
  projectDirectoryUrl,
  rootProjectDirectoryUrl,
  importMapFileRelativeUrl = "./import-map.importmap",
  projectPackageDevDependenciesIncluded = "undefined" !== "production",
  // pass ["import", "browser", "require"] to read browser first if defined
  packagesExportsPreference = ["import", "node", "require"],
  packagesExportsIncluded = true,
  packagesSelfReference = true,
  packagesImportsIncluded = true,
  packagesManualOverrides = {},
  packageIncludedPredicate = () => true
}) => {
  const logger$1 = logger.createLogger({
    logLevel
  });
  projectDirectoryUrl = util.assertAndNormalizeDirectoryUrl(projectDirectoryUrl);

  if (typeof rootProjectDirectoryUrl === "undefined") {
    rootProjectDirectoryUrl = projectDirectoryUrl;
  } else {
    rootProjectDirectoryUrl = util.assertAndNormalizeDirectoryUrl(rootProjectDirectoryUrl);
  }

  const projectPackageFileUrl = util.resolveUrl("./package.json", projectDirectoryUrl);
  const rootProjectPackageFileUrl = util.resolveUrl("./package.json", rootProjectDirectoryUrl);
  const imports = {};
  const scopes = {};
  const seen = {};

  const markPackageAsSeen = (packageFileUrl, importerPackageFileUrl) => {
    if (packageFileUrl in seen) {
      seen[packageFileUrl].push(importerPackageFileUrl);
    } else {
      seen[packageFileUrl] = [importerPackageFileUrl];
    }
  };

  const packageIsSeen = (packageFileUrl, importerPackageFileUrl) => {
    return packageFileUrl in seen && seen[packageFileUrl].includes(importerPackageFileUrl);
  };

  const visit = async ({
    packageFileUrl,
    packageName,
    packageJsonObject,
    importerPackageFileUrl,
    importerPackageJsonObject,
    includeDevDependencies
  }) => {
    if (!packageIncludedPredicate({
      packageName,
      packageFileUrl,
      packageJsonObject
    })) {
      return;
    }

    await visitDependencies({
      packageFileUrl,
      packageJsonObject,
      includeDevDependencies
    });
    await visitPackage({
      packageFileUrl,
      packageName,
      packageJsonObject,
      importerPackageFileUrl,
      importerPackageJsonObject
    });
  };

  const visitPackage = async ({
    packageFileUrl,
    packageName,
    packageJsonObject,
    importerPackageFileUrl,
    importerPackageJsonObject
  }) => {
    const packageInfo = computePackageInfo({
      packageFileUrl,
      packageName,
      importerPackageFileUrl
    });
    await visitPackageMain({
      packageFileUrl,
      packageName,
      packageJsonObject,
      packageInfo
    });

    if (packagesImportsIncluded && "imports" in packageJsonObject) {
      const importsForPackageImports = visitPackageImports({
        logger: logger$1,
        packageFileUrl,
        packageName,
        packageJsonObject,
        packageInfo
      });
      const {
        packageIsRoot,
        packageDirectoryRelativeUrl
      } = packageInfo;
      Object.keys(importsForPackageImports).forEach(from => {
        const to = importsForPackageImports[from];

        if (packageIsRoot) {
          addTopLevelImportMapping({
            from,
            to
          });
        } else {
          const toScoped = to[0] === "/" ? to : `./${packageDirectoryRelativeUrl}${to.startsWith("./") ? to.slice(2) : to}`;
          addScopedImportMapping({
            scope: `./${packageDirectoryRelativeUrl}`,
            from,
            to: toScoped
          }); // when a package says './' maps to './'
          // we must add something to say if we are already inside the package
          // no need to ensure leading slash are scoped to the package

          if (from === "./" && to === "./") {
            addScopedImportMapping({
              scope: `./${packageDirectoryRelativeUrl}`,
              from: `./${packageDirectoryRelativeUrl}`,
              to: `./${packageDirectoryRelativeUrl}`
            });
          } else if (from === "/" && to === "/") {
            addScopedImportMapping({
              scope: `./${packageDirectoryRelativeUrl}`,
              from: `./${packageDirectoryRelativeUrl}`,
              to: `./${packageDirectoryRelativeUrl}`
            });
          }
        }
      });
    }

    if (packagesSelfReference) {
      const {
        packageIsRoot,
        packageDirectoryRelativeUrl
      } = packageInfo; // allow import 'package-name/dir/file.js' in package-name files

      if (packageIsRoot) {
        addTopLevelImportMapping({
          from: `${packageName}/`,
          to: `./${packageDirectoryRelativeUrl}`
        });
      } // scoped allow import 'package-name/dir/file.js' in package-name files
      else {
          addScopedImportMapping({
            scope: `./${packageDirectoryRelativeUrl}`,
            from: `${packageName}/`,
            to: `./${packageDirectoryRelativeUrl}`
          });
        }
    }

    if (packagesExportsIncluded && "exports" in packageJsonObject) {
      const importsForPackageExports = visitPackageExports({
        logger: logger$1,
        packageFileUrl,
        packageName,
        packageJsonObject,
        packageInfo,
        packagesExportsPreference
      });
      const {
        importerIsRoot,
        importerRelativeUrl,
        packageIsRoot,
        packageDirectoryRelativeUrl // packageDirectoryUrl,
        // packageDirectoryUrlExpected,

      } = packageInfo;

      if (packageIsRoot && packagesSelfReference) {
        Object.keys(importsForPackageExports).forEach(from => {
          const to = importsForPackageExports[from];
          addTopLevelImportMapping({
            from,
            to
          });
        });
      } else if (packageIsRoot) ; else {
        Object.keys(importsForPackageExports).forEach(from => {
          const to = importsForPackageExports[from]; // own package exports available to himself

          if (importerIsRoot) {
            // importer is the package himself, keep exports scoped
            // otherwise the dependency exports would override the package exports.
            if (importerPackageJsonObject.name === packageName) {
              addScopedImportMapping({
                scope: `./${packageDirectoryRelativeUrl}`,
                from,
                to
              });

              if (from === packageName || from in imports === false) {
                addTopLevelImportMapping({
                  from,
                  to
                });
              }
            } else {
              addTopLevelImportMapping({
                from,
                to
              });
            }
          } else {
            addScopedImportMapping({
              scope: `./${packageDirectoryRelativeUrl}`,
              from,
              to
            });
          } // now make package exports available to the importer
          // if importer is root no need because the top level remapping does it


          if (importerIsRoot) {
            return;
          } // now make it available to the importer
          // here if the importer is himself we could do stuff
          // we should even handle the case earlier to prevent top level remapping


          addScopedImportMapping({
            scope: `./${importerRelativeUrl}`,
            from,
            to
          });
        });
      }
    }
  };

  const visitPackageMain = async ({
    packageFileUrl,
    packageName,
    packageJsonObject,
    packageInfo: {
      importerIsRoot,
      importerRelativeUrl,
      packageIsRoot,
      packageIsProject,
      packageDirectoryUrl,
      packageDirectoryUrlExpected
    }
  }) => {
    const self = packageIsRoot || packageIsProject;
    if (self && !packagesSelfReference) return;
    const mainFileUrl = await resolvePackageMain({
      packageFileUrl,
      packageJsonObject,
      logger: logger$1
    }); // it's possible to have no main
    // like { main: "" } in package.json
    // or a main that does not lead to an actual file

    if (mainFileUrl === null) return;
    const mainFileRelativeUrl = util.urlToRelativeUrl(mainFileUrl, rootProjectDirectoryUrl);
    const from = packageName;
    const to = `./${mainFileRelativeUrl}`;

    if (importerIsRoot) {
      addTopLevelImportMapping({
        from,
        to
      });
    } else {
      addScopedImportMapping({
        scope: `./${importerRelativeUrl}`,
        from,
        to
      });
    }

    if (packageDirectoryUrl !== packageDirectoryUrlExpected) {
      addScopedImportMapping({
        scope: `./${importerRelativeUrl}`,
        from,
        to
      });
    }
  };

  const visitDependencies = async ({
    packageFileUrl,
    packageJsonObject,
    includeDevDependencies
  }) => {
    const dependencyMap = {};
    const {
      dependencies = {}
    } = packageJsonObject; // https://npm.github.io/using-pkgs-docs/package-json/types/optionaldependencies.html

    const {
      optionalDependencies = {}
    } = packageJsonObject;
    Object.keys(dependencies).forEach(dependencyName => {
      dependencyMap[dependencyName] = {
        type: "dependency",
        isOptional: dependencyName in optionalDependencies,
        versionPattern: dependencies[dependencyName]
      };
    });
    const {
      peerDependencies = {}
    } = packageJsonObject;
    const {
      peerDependenciesMeta = {}
    } = packageJsonObject;
    Object.keys(peerDependencies).forEach(dependencyName => {
      dependencyMap[dependencyName] = {
        type: "peerDependency",
        versionPattern: peerDependencies[dependencyName],
        isOptional: dependencyName in peerDependenciesMeta && peerDependenciesMeta[dependencyName].optional
      };
    });
    const isProjectPackage = packageFileUrl === projectPackageFileUrl;

    if (includeDevDependencies && isProjectPackage) {
      const {
        devDependencies = {}
      } = packageJsonObject;
      Object.keys(devDependencies).forEach(dependencyName => {
        if (!dependencyMap.hasOwnProperty(dependencyName)) {
          dependencyMap[dependencyName] = {
            type: "devDependency",
            versionPattern: devDependencies[dependencyName]
          };
        }
      });
    }

    await Promise.all(Object.keys(dependencyMap).map(async dependencyName => {
      const dependency = dependencyMap[dependencyName];
      await visitDependency({
        packageFileUrl,
        packageJsonObject,
        dependencyName,
        dependencyType: dependency.type,
        dependencyIsOptional: dependency.isOptional,
        dependencyVersionPattern: dependency.versionPattern
      });
    }));
  };

  const visitDependency = async ({
    packageFileUrl,
    packageJsonObject,
    dependencyName,
    dependencyType,
    dependencyIsOptional,
    dependencyVersionPattern
  }) => {
    const dependencyData = await findDependency({
      packageFileUrl,
      dependencyName
    });

    if (!dependencyData) {
      logger$1[dependencyIsOptional ? "debug" : "warn"](`
${dependencyIsOptional ? `cannot find an optional ${dependencyType}.` : `cannot find a ${dependencyType}.`}
--- ${dependencyType} ---
${dependencyName}@${dependencyVersionPattern}
--- required by ---
${packageJsonObject.name}@${packageJsonObject.version}
--- package.json path ---
${util.urlToFileSystemPath(packageFileUrl)}
    `);
      return;
    }

    const {
      packageFileUrl: dependencyPackageFileUrl,
      packageJsonObject: dependencyPackageJsonObject
    } = dependencyData;

    if (packageIsSeen(dependencyPackageFileUrl, packageFileUrl)) {
      return;
    }

    markPackageAsSeen(dependencyPackageFileUrl, packageFileUrl);
    await visit({
      packageFileUrl: dependencyPackageFileUrl,
      packageName: dependencyName,
      packageJsonObject: dependencyPackageJsonObject,
      importerPackageFileUrl: packageFileUrl,
      importerPackageJsonObject: packageJsonObject
    });
  };

  const computePackageInfo = ({
    packageFileUrl,
    packageName,
    importerPackageFileUrl
  }) => {
    const importerIsRoot = importerPackageFileUrl === rootProjectPackageFileUrl;
    const importerIsProject = importerPackageFileUrl === projectPackageFileUrl;
    const importerPackageDirectoryUrl = util.resolveUrl("./", importerPackageFileUrl);
    const importerRelativeUrl = importerIsRoot ? `${util.urlToBasename(rootProjectDirectoryUrl.slice(0, -1))}/` : util.urlToRelativeUrl(importerPackageDirectoryUrl, rootProjectDirectoryUrl);
    const packageIsRoot = packageFileUrl === rootProjectPackageFileUrl;
    const packageIsProject = packageFileUrl === projectPackageFileUrl;
    const packageDirectoryUrl = util.resolveUrl("./", packageFileUrl);
    let packageDirectoryUrlExpected;

    if (packageIsProject && !packageIsRoot) {
      packageDirectoryUrlExpected = importerPackageDirectoryUrl;
    } else {
      packageDirectoryUrlExpected = `${importerPackageDirectoryUrl}node_modules/${packageName}/`;
    }

    const packageDirectoryRelativeUrl = util.urlToRelativeUrl(packageDirectoryUrl, rootProjectDirectoryUrl);
    return {
      importerIsRoot,
      importerIsProject,
      importerRelativeUrl,
      packageIsRoot,
      packageIsProject,
      packageDirectoryUrl,
      packageDirectoryUrlExpected,
      packageDirectoryRelativeUrl
    };
  };

  const addTopLevelImportMapping = ({
    from,
    to
  }) => {
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
      if (from === "/") return;
    }

    imports[from] = to;
  };

  const addScopedImportMapping = ({
    scope,
    from,
    to
  }) => {
    scopes[scope] = { ...(scopes[scope] || {}),
      [from]: to
    };
  };

  const dependenciesCache = {};

  const findDependency = ({
    packageFileUrl,
    dependencyName
  }) => {
    if (packageFileUrl in dependenciesCache === false) {
      dependenciesCache[packageFileUrl] = {};
    }

    if (dependencyName in dependenciesCache[packageFileUrl]) {
      return dependenciesCache[packageFileUrl][dependencyName];
    }

    const dependencyPromise = resolveNodeModule({
      logger: logger$1,
      rootProjectDirectoryUrl,
      packagesManualOverrides,
      packageFileUrl,
      dependencyName
    });
    dependenciesCache[packageFileUrl][dependencyName] = dependencyPromise;
    return dependencyPromise;
  };

  const projectPackageJsonObject = await readPackageFile(projectPackageFileUrl, packagesManualOverrides);
  const packageFileUrl = projectPackageFileUrl;
  const importerPackageFileUrl = projectPackageFileUrl;
  markPackageAsSeen(packageFileUrl, importerPackageFileUrl);
  const packageName = projectPackageJsonObject.name;

  if (typeof packageName === "string") {
    await visit({
      packageFileUrl,
      packageName: projectPackageJsonObject.name,
      packageJsonObject: projectPackageJsonObject,
      importerPackageFileUrl,
      importerPackageJsonObject: null,
      includeDevDependencies: projectPackageDevDependenciesIncluded
    });
  } else {
    logger$1.warn(`package name field must be a string
--- package name field ---
${packageName}
--- package.json file path ---
${packageFileUrl}`);
  } // remove useless duplicates (scoped key+value already defined on imports)


  Object.keys(scopes).forEach(key => {
    const scopedImports = scopes[key];
    Object.keys(scopedImports).forEach(scopedImportKey => {
      if (scopedImportKey in imports && imports[scopedImportKey] === scopedImports[scopedImportKey]) {
        delete scopedImports[scopedImportKey];
      }
    });

    if (Object.keys(scopedImports).length === 0) {
      delete scopes[key];
    }
  }); // The importmap generated at this point is relative to the project directory url
  // In other words if you want to use that importmap you have to put it
  // inside projectDirectoryUrl (it cannot be nested in a subdirectory).

  let importMap$1 = {
    imports,
    scopes
  };

  if (importMapFileRelativeUrl) {
    // When there is an importMapFileRelativeUrl we will make remapping relative
    // to the importmap file future location (where user will write it).
    // This allows to put the importmap anywhere inside the projectDirectoryUrl.
    // (If possible prefer to have it top level to avoid too many ../
    const importMapProjectUrl = util.resolveUrl("project.importmap", projectDirectoryUrl);
    const importMapRealUrl = util.resolveUrl(importMapFileRelativeUrl, projectDirectoryUrl);
    importMap$1 = importMap.moveImportMap(importMap$1, importMapProjectUrl, importMapRealUrl);
  }

  importMap$1 = importMap.sortImportMap(importMap$1);
  return importMap$1;
};

const getImportMapFromFile = async importMapFilePath => {
  const importMapFileUrl = util.assertAndNormalizeFileUrl(importMapFilePath);
  const importMapFileContent = await util.readFile(importMapFileUrl);
  const importMap = JSON.parse(importMapFileContent);
  return importMap;
};

const importMapToVsCodeConfigPaths = ({
  imports = {}
}) => {
  const paths = {};
  Object.keys(imports).forEach(importKey => {
    const importValue = imports[importKey];
    let key;

    if (importKey.endsWith("/")) {
      key = `${importKey}*`;
    } else {
      key = importKey;
    }

    const importValueArray = typeof importValue === "string" ? [importValue] : importValue;
    const candidatesForPath = importValueArray.map(importValue => {
      if (importValue.endsWith("/")) {
        return `${importValue}*`;
      }

      return importValue;
    });

    if (key in paths) {
      paths[key] = [...paths[key], ...candidatesForPath];
    } else {
      paths[key] = candidatesForPath;
    }
  });
  return paths;
};

const generateImportMapForProject = async (importMapInputs = [], {
  projectDirectoryUrl,
  importMapFile = true,
  // in case someone wants the importmap but not write it on filesystem
  importMapFileRelativeUrl = "./import-map.importmap",
  importMapFileLog = true,
  jsConfigFile = false,
  // not yet documented, makes vscode aware of the import remapping
  jsConfigFileLog = true,
  jsConfigLeadingSlash = false,
  jsConfigBase = {}
}) => {
  projectDirectoryUrl = util.assertAndNormalizeDirectoryUrl(projectDirectoryUrl);

  if (importMapInputs.length === 0) {
    console.warn(`importMapInputs is empty, the generated importmap will be empty`);
  }

  const importMaps = await Promise.all(importMapInputs);
  const importMap$1 = importMaps.reduce((previous, current) => {
    return importMap.composeTwoImportMaps(previous, current);
  }, {});

  if (importMapFile) {
    const importMapFileUrl = util.resolveUrl(importMapFileRelativeUrl, projectDirectoryUrl);
    await util.writeFile(importMapFileUrl, JSON.stringify(importMap$1, null, "  "));

    if (importMapFileLog) {
      console.info(`-> ${util.urlToFileSystemPath(importMapFileUrl)}`);
    }
  }

  if (jsConfigFile) {
    const jsConfigFileUrl = util.resolveUrl("./jsconfig.json", projectDirectoryUrl);

    try {
      const jsConfig = {
        compilerOptions: {
          baseUrl: ".",
          ...jsConfigBase,
          paths: { ...(jsConfigLeadingSlash ? {
              "/*": ["./*"]
            } : {}),
            ...importMapToVsCodeConfigPaths(importMap$1)
          }
        }
      };
      await util.writeFile(jsConfigFileUrl, JSON.stringify(jsConfig, null, "  "));

      if (jsConfigFileLog) {
        console.info(`-> ${util.urlToFileSystemPath(jsConfigFileUrl)}`);
      }
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw e;
      }
    }
  }

  return importMap$1;
};

exports.generateImportMapForProject = generateImportMapForProject;
exports.getImportMapFromFile = getImportMapFromFile;
exports.getImportMapFromNodeModules = getImportMapFromNodeModules;

//# sourceMappingURL=main.cjs.map