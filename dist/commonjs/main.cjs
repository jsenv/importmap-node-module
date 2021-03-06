'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var logger = require('@jsenv/logger');
var importMap = require('@jsenv/import-map');
var util = require('@jsenv/util');
var cancellation = require('@jsenv/cancellation');

const resolveFile = async (fileUrl, {
  magicExtensions
}) => {
  const fileStat = await util.readFileSystemNodeStat(fileUrl, {
    nullIfNotFound: true
  }); // file found

  if (fileStat && fileStat.isFile()) {
    return fileUrl;
  } // directory found


  if (fileStat && fileStat.isDirectory()) {
    const indexFileSuffix = fileUrl.endsWith("/") ? "index" : "/index";
    const indexFileUrl = `${fileUrl}${indexFileSuffix}`;
    const extensionLeadingToAFile = await findExtensionLeadingToFile(indexFileUrl, magicExtensions);

    if (extensionLeadingToAFile === null) {
      return null;
    }

    return `${indexFileUrl}.${extensionLeadingToAFile}`;
  } // file not found and it has an extension


  const extension = util.urlToExtension(fileUrl);

  if (extension !== "") {
    return null;
  }

  const extensionLeadingToAFile = await findExtensionLeadingToFile(fileUrl, magicExtensions); // magic extension not found

  if (extensionLeadingToAFile === null) {
    return null;
  } // magic extension worked


  return `${fileUrl}.${extensionLeadingToAFile}`;
};

const findExtensionLeadingToFile = async (fileUrl, magicExtensions) => {
  const fileDirectoryUrl = util.resolveUrl("./", fileUrl);
  const fileBasename = util.urlToBasename(fileUrl);
  const extensionLeadingToFile = await cancellation.firstOperationMatching({
    array: magicExtensions,
    start: async extensionCandidate => {
      const filePathCandidate = `${fileDirectoryUrl}/${fileBasename}.${extensionCandidate}`;
      const stats = await util.readFileSystemNodeStat(filePathCandidate, {
        nullIfNotFound: true
      });
      return stats && stats.isFile() ? extensionCandidate : null;
    },
    predicate: extension => Boolean(extension)
  });
  return extensionLeadingToFile || null;
};

const magicExtensions = ["js", "json", "node"];
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

  const mainFileUrl = await resolveFile(mainFileUrlFirstCandidate, {
    magicExtensions
  });

  if (!mainFileUrl) {
    // we know in advance this remapping does not lead to an actual file.
    // we only warn because we have no guarantee this remapping will actually be used
    // in the codebase.
    // warn only if there is actually a main field
    // otherwise the package.json is missing the main field
    // it certainly means it's not important
    if (packageMainFieldName !== "default") {
      logger.warn(formatFileNotFoundLog({
        specifier: packageMainFieldValue,
        importedIn: `${packageFileUrl}#${packageMainFieldName}`,
        fileUrl: mainFileUrlFirstCandidate,
        magicExtensions
      }));
    }

    return mainFileUrlFirstCandidate;
  }

  return mainFileUrl;
};

const formatFileNotFoundLog = ({
  specifier,
  importedIn,
  fileUrl,
  magicExtensions
}) => {
  return logger.createDetailedMessage(`Cannot find file for "${specifier}"`, {
    "imported in": importedIn,
    "file url": fileUrl,
    ...(util.urlToExtension(fileUrl) === "" ? {
      ["extensions tried"]: magicExtensions.join(`,`)
    } : {})
  });
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

  const addRemapping = ({
    from,
    to
  }) => {
    if (from.indexOf("*") === -1) {
      importsForPackageExports[from] = to;
      return;
    }

    if (from.endsWith("/*") && to.endsWith("/*") && // ensure ends with '*' AND there is only one '*' occurence
    to.indexOf("*") === to.length - 1) {
      const fromWithouTrailingStar = from.slice(0, -1);
      const toWithoutTrailingStar = to.slice(0, -1);
      importsForPackageExports[fromWithouTrailingStar] = toWithoutTrailingStar;
      return;
    }

    logger.warn(`Ignoring export using "*" because it is not supported by importmap.
--- key ---
${from}
--- value ---
${to}
--- package.json path ---
${packageFilePath}
--- see also ---
https://github.com/WICG/import-maps/issues/232`);
  }; // exports used to indicate the main file


  if (typeof packageExports === "string") {
    addRemapping({
      from: packageName,
      to: addressToDestination(packageExports, packageDirectoryRelativeUrl)
    });
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

    addRemapping({
      from: specifierToSource(specifier, packageName),
      to: addressToDestination(address, packageDirectoryRelativeUrl)
    });
  });
  return importsForPackageExports;
};

const specifierToSource = (specifier, packageName) => {
  if (specifier === ".") {
    return packageName;
  }

  if (specifier[0] === "/") {
    return specifier;
  }

  if (specifier.startsWith("./")) {
    return `${packageName}${specifier.slice(1)}`;
  }

  return `${packageName}/${specifier}`;
};

const addressToDestination = (address, packageDirectoryRelativeUrl) => {
  if (address[0] === "/") {
    return address;
  }

  if (address.startsWith("./")) {
    return `./${packageDirectoryRelativeUrl}${address.slice(2)}`;
  }

  return `./${packageDirectoryRelativeUrl}${address}`;
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

const memoizeAsyncFunctionByUrl = fn => {
  const cache = {};
  return async (url, ...args) => {
    const promiseFromCache = cache[url];

    if (promiseFromCache) {
      return promiseFromCache;
    }

    let _resolve;

    let _reject;

    const promise = new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });
    cache[url] = promise;
    let value;
    let error;

    try {
      value = fn(url, ...args);
      error = false;
    } catch (e) {
      value = e;
      error = true;
      delete cache[url];
    }

    if (error) {
      _reject(error);
    } else {
      _resolve(value);
    }

    return promise;
  };
};

const applyPackageManualOverride = (packageObject, packagesManualOverrides) => {
  const {
    name,
    version
  } = packageObject;
  const overrideKey = Object.keys(packagesManualOverrides).find(overrideKeyCandidate => {
    if (name === overrideKeyCandidate) {
      return true;
    }

    if (`${name}@${version}` === overrideKeyCandidate) {
      return true;
    }

    return false;
  });

  if (overrideKey) {
    return composeObject(packageObject, packagesManualOverrides[overrideKey]);
  }

  return packageObject;
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

const PACKAGE_NOT_FOUND = {};
const PACKAGE_WITH_SYNTAX_ERROR = {};
const readPackageFile = async (packageFileUrl, packagesManualOverrides) => {
  try {
    const packageObject = await util.readFile(packageFileUrl, {
      as: "json"
    });
    return applyPackageManualOverride(packageObject, packagesManualOverrides);
  } catch (e) {
    if (e.code === "ENOENT") {
      return PACKAGE_NOT_FOUND;
    }

    if (e.name === "SyntaxError") {
      console.error(formatPackageSyntaxErrorLog({
        syntaxError: e,
        packageFileUrl
      }));
      return PACKAGE_WITH_SYNTAX_ERROR;
    }

    throw e;
  }
};

const formatPackageSyntaxErrorLog = ({
  syntaxError,
  packageFileUrl
}) => {
  return `
error while parsing package.json.
--- syntax error message ---
${syntaxError.message}
--- package.json path ---
${util.urlToFileSystemPath(packageFileUrl)}
`;
};

const createFindNodeModulePackage = packagesManualOverrides => {
  const readPackageFileMemoized = memoizeAsyncFunctionByUrl(packageFileUrl => {
    return readPackageFile(packageFileUrl, packagesManualOverrides);
  });
  return ({
    projectDirectoryUrl,
    packageFileUrl,
    dependencyName
  }) => {
    const nodeModuleCandidates = getNodeModuleCandidates(packageFileUrl, projectDirectoryUrl);
    return cancellation.firstOperationMatching({
      array: nodeModuleCandidates,
      start: async nodeModuleCandidate => {
        const packageFileUrlCandidate = `${projectDirectoryUrl}${nodeModuleCandidate}${dependencyName}/package.json`;
        const packageObjectCandidate = await readPackageFileMemoized(packageFileUrlCandidate);
        return {
          packageFileUrl: packageFileUrlCandidate,
          packageJsonObject: packageObjectCandidate
        };
      },
      predicate: ({
        packageJsonObject
      }) => {
        return packageJsonObject !== PACKAGE_NOT_FOUND && packageJsonObject !== PACKAGE_WITH_SYNTAX_ERROR;
      }
    });
  };
};

const getNodeModuleCandidates = (fileUrl, projectDirectoryUrl) => {
  const fileDirectoryUrl = util.resolveUrl("./", fileUrl);

  if (fileDirectoryUrl === projectDirectoryUrl) {
    return [`node_modules/`];
  }

  const fileDirectoryRelativeUrl = util.urlToRelativeUrl(fileDirectoryUrl, projectDirectoryUrl);
  const candidates = [];
  const relativeNodeModuleDirectoryArray = fileDirectoryRelativeUrl.split("node_modules/"); // remove the first empty string

  relativeNodeModuleDirectoryArray.shift();
  let i = relativeNodeModuleDirectoryArray.length;

  while (i--) {
    candidates.push(`node_modules/${relativeNodeModuleDirectoryArray.slice(0, i + 1).join("node_modules/")}node_modules/`);
  }

  return [...candidates, "node_modules/"];
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
  packagesExportsPreference = ["import", "browser"],
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
  const findNodeModulePackage = createFindNodeModulePackage(packagesManualOverrides);
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
    const dependencyMap = packageDependenciesFromPackageObject(packageJsonObject, {
      includeDevDependencies
    });
    await Promise.all(Object.keys(dependencyMap).map(async dependencyName => {
      const dependencyInfo = dependencyMap[dependencyName];
      await visitDependency({
        packageFileUrl,
        packageJsonObject,
        dependencyName,
        dependencyInfo
      });
    }));
  };

  const visitDependency = async ({
    packageFileUrl,
    packageJsonObject,
    dependencyName,
    dependencyInfo
  }) => {
    const dependencyData = await findDependency({
      packageFileUrl,
      dependencyName
    });

    if (!dependencyData) {
      logger$1[dependencyInfo.isOptional ? "debug" : "warn"](formatCannotFindPackageLog({
        dependencyName,
        dependencyInfo,
        packageFileUrl
      }));
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

    const dependencyPromise = findNodeModulePackage({
      projectDirectoryUrl: rootProjectDirectoryUrl,
      packageFileUrl,
      dependencyName
    });
    dependenciesCache[packageFileUrl][dependencyName] = dependencyPromise;
    return dependencyPromise;
  };

  const projectPackageJsonObject = await util.readFile(projectPackageFileUrl, {
    as: "json"
  });
  const importerPackageFileUrl = projectPackageFileUrl;
  markPackageAsSeen(projectPackageFileUrl, importerPackageFileUrl);
  const packageName = projectPackageJsonObject.name;

  if (typeof packageName !== "string") {
    logger$1.warn(formatUnexpectedPackageNameLog({
      packageName,
      packageFileUrl: projectPackageFileUrl
    }));
    return {};
  }

  await visit({
    packageFileUrl: projectPackageFileUrl,
    packageName: projectPackageJsonObject.name,
    packageJsonObject: projectPackageJsonObject,
    importerPackageFileUrl,
    importerPackageJsonObject: null,
    includeDevDependencies: projectPackageDevDependenciesIncluded
  }); // remove useless duplicates (scoped key+value already defined on imports)

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

const packageDependenciesFromPackageObject = (packageObject, {
  includeDevDependencies
}) => {
  const packageDependencies = {};
  const {
    dependencies = {}
  } = packageObject; // https://npm.github.io/using-pkgs-docs/package-json/types/optionaldependencies.html

  const {
    optionalDependencies = {}
  } = packageObject;
  Object.keys(dependencies).forEach(dependencyName => {
    packageDependencies[dependencyName] = {
      type: "dependency",
      isOptional: dependencyName in optionalDependencies,
      versionPattern: dependencies[dependencyName]
    };
  });
  const {
    peerDependencies = {}
  } = packageObject;
  const {
    peerDependenciesMeta = {}
  } = packageObject;
  Object.keys(peerDependencies).forEach(dependencyName => {
    packageDependencies[dependencyName] = {
      type: "peerDependency",
      versionPattern: peerDependencies[dependencyName],
      isOptional: dependencyName in peerDependenciesMeta && peerDependenciesMeta[dependencyName].optional
    };
  });

  if (includeDevDependencies) {
    const {
      devDependencies = {}
    } = packageObject;
    Object.keys(devDependencies).forEach(dependencyName => {
      if (!packageDependencies.hasOwnProperty(dependencyName)) {
        packageDependencies[dependencyName] = {
          type: "devDependency",
          versionPattern: devDependencies[dependencyName]
        };
      }
    });
  }

  return packageDependencies;
};

const formatUnexpectedPackageNameLog = ({
  packageName,
  packageFileUrl
}) => {
  return `
package name field must be a string
--- package name field ---
${packageName}
--- package.json file path ---
${packageFileUrl}
`;
};

const formatCannotFindPackageLog = ({
  dependencyName,
  dependencyInfo,
  packageFileUrl
}) => {
  const dependencyIsOptional = dependencyInfo.isOptional;
  const dependencyType = dependencyInfo.type;
  const dependencyVersionPattern = dependencyInfo.versionPattern;
  const detailedMessage = logger.createDetailedMessage(dependencyIsOptional ? `cannot find an optional ${dependencyType}.` : `cannot find a ${dependencyType}.`, {
    [dependencyType]: `${dependencyName}@${dependencyVersionPattern}`,
    "required by": util.urlToFileSystemPath(packageFileUrl)
  });
  return `
${detailedMessage}
`;
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