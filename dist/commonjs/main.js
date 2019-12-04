'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var url = require('url');
var util = require('util');
var fs = require('fs');

const assertImportMap = value => {
  if (value === null) {
    throw new TypeError(`an importMap must be an object, got null`);
  }

  const type = typeof value;

  if (type !== "object") {
    throw new TypeError(`an importMap must be an object, received ${value}`);
  }

  if (Array.isArray(value)) {
    throw new TypeError(`an importMap must be an object, received array ${value}`);
  }
};

// https://github.com/systemjs/systemjs/blob/89391f92dfeac33919b0223bbf834a1f4eea5750/src/common.js#L136
const composeTwoImportMaps = (leftImportMap, rightImportMap) => {
  assertImportMap(leftImportMap);
  assertImportMap(rightImportMap);
  return {
    imports: composeTwoImports(leftImportMap.imports, rightImportMap.imports),
    scopes: composeTwoScopes(leftImportMap.scopes, rightImportMap.scopes)
  };
};

const composeTwoImports = (leftImports = {}, rightImports = {}) => {
  return { ...leftImports,
    ...rightImports
  };
};

const composeTwoScopes = (leftScopes = {}, rightScopes = {}) => {
  const scopes = { ...leftScopes
  };
  Object.keys(rightScopes).forEach(scopeKey => {
    if (scopes.hasOwnProperty(scopeKey)) {
      scopes[scopeKey] = { ...scopes[scopeKey],
        ...rightScopes[scopeKey]
      };
    } else {
      scopes[scopeKey] = { ...rightScopes[scopeKey]
      };
    }
  });
  return scopes;
};

const sortImportMap = importMap => {
  assertImportMap(importMap);
  const {
    imports,
    scopes
  } = importMap;
  return {
    imports: imports ? sortImports(imports) : undefined,
    scopes: scopes ? sortScopes(scopes) : undefined
  };
};
const sortImports = imports => {
  const importsSorted = {};
  Object.keys(imports).sort(compareLengthOrLocaleCompare).forEach(name => {
    importsSorted[name] = imports[name];
  });
  return importsSorted;
};
const sortScopes = scopes => {
  const scopesSorted = {};
  Object.keys(scopes).sort(compareLengthOrLocaleCompare).forEach(scopeName => {
    scopesSorted[scopeName] = sortImports(scopes[scopeName]);
  });
  return scopesSorted;
};

const compareLengthOrLocaleCompare = (a, b) => {
  return b.length - a.length || a.localeCompare(b);
};

const pathToDirectoryUrl = path => {
  const directoryUrl = path.startsWith("file://") ? path : String(url.pathToFileURL(path));

  if (directoryUrl.endsWith("/")) {
    return directoryUrl;
  }

  return `${directoryUrl}/`;
};
const fileUrlToPath = fileUrl => {
  return url.fileURLToPath(fileUrl);
};
const directoryUrlToPackageFileUrl = directoryUrl => {
  return String(new URL("./package.json", directoryUrl));
};
const resolveUrl = (specifier, baseUrl) => {
  return String(new URL(specifier, baseUrl));
};
const fileUrlToDirectoryUrl = fileUrl => {
  const directoryUrl = String(new URL("./", fileUrl));

  if (directoryUrl.endsWith("/")) {
    return directoryUrl;
  }

  return `${directoryUrl}/`;
};
const fileUrlToRelativePath = (fileUrl, baseUrl) => {
  if (fileUrl.startsWith(baseUrl)) {
    return `./${fileUrl.slice(baseUrl.length)}`;
  }

  return fileUrl;
};
const hasScheme = string => {
  return /^[a-zA-Z]{2,}:/.test(string);
};

const readPackageFile = async path => {
  const packageFileString = await readFileContent(path);
  const packageJsonObject = JSON.parse(packageFileString);
  return packageJsonObject;
};
const readFilePromisified = util.promisify(fs.readFile);

const readFileContent = async filePath => {
  const buffer = await readFilePromisified(filePath);
  return buffer.toString();
};

const firstOperationMatching = ({
  array,
  start,
  predicate
}) => {
  if (typeof array !== "object") {
    throw new TypeError(`array must be an object, got ${array}`);
  }

  if (typeof start !== "function") {
    throw new TypeError(`start must be a function, got ${start}`);
  }

  if (typeof predicate !== "function") {
    throw new TypeError(`predicate must be a function, got ${predicate}`);
  }

  return new Promise((resolve, reject) => {
    const visit = index => {
      if (index >= array.length) {
        return resolve();
      }

      const input = array[index];
      const returnValue = start(input);
      return Promise.resolve(returnValue).then(output => {
        if (predicate(output)) {
          return resolve(output);
        }

        return visit(index + 1);
      }, reject);
    };

    visit(0);
  });
};

const isCancelError = value => {
  return value && typeof value === "object" && value.name === "CANCEL_ERROR";
};

const catchAsyncFunctionCancellation = asyncFunction => {
  return asyncFunction().catch(error => {
    if (isCancelError(error)) return;
    throw error;
  });
};

const resolveNodeModule = async ({
  logger,
  rootProjectDirectoryUrl,
  packageFileUrl,
  packageJsonObject,
  dependencyName,
  dependencyVersionPattern,
  dependencyType
}) => {
  const packageDirectoryUrl = fileUrlToDirectoryUrl(packageFileUrl);
  const nodeModuleCandidateArray = [...computeNodeModuleCandidateArray(packageDirectoryUrl, rootProjectDirectoryUrl), `node_modules/`];
  const result = await firstOperationMatching({
    array: nodeModuleCandidateArray,
    start: async nodeModuleCandidate => {
      const packageFileUrl = `${rootProjectDirectoryUrl}${nodeModuleCandidate}${dependencyName}/package.json`;
      const packageFilePath = url.fileURLToPath(packageFileUrl);

      try {
        const packageJsonObject = await readPackageFile(packageFilePath);
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
${packageFilePath}
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

  if (!result) {
    logger.warn(`
cannot find a ${dependencyType}.
--- ${dependencyType} ---
${dependencyName}@${dependencyVersionPattern}
--- required by ---
${packageJsonObject.name}@${packageJsonObject.version}
--- package.json path ---
${url.fileURLToPath(packageFileUrl)}
    `);
  }

  return result;
};

const computeNodeModuleCandidateArray = (packageDirectoryUrl, rootProjectDirectoryUrl) => {
  if (packageDirectoryUrl === rootProjectDirectoryUrl) {
    return [];
  }

  const packageDirectoryRelativePath = fileUrlToRelativePath(packageDirectoryUrl, rootProjectDirectoryUrl);
  const candidateArray = [];
  const relativeNodeModuleDirectoryArray = packageDirectoryRelativePath.split("/node_modules/"); // remove the first empty string

  relativeNodeModuleDirectoryArray.shift();
  let i = relativeNodeModuleDirectoryArray.length;

  while (i--) {
    candidateArray.push(`node_modules/${relativeNodeModuleDirectoryArray.slice(0, i + 1).join("/node_modules/")}node_modules/`);
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

  const packageFilePath = fileUrlToPath(packageFileUrl);
  const packageDirectoryUrl = fileUrlToDirectoryUrl(packageFileUrl);
  const mainFileRelativePath = packageMainFieldValue.endsWith("/") ? `${packageMainFieldValue}index` : packageMainFieldValue;
  const mainFileUrlFirstCandidate = resolveUrl(mainFileRelativePath, packageFileUrl);

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
      logger.warn(`
cannot find file for package.json ${packageMainFieldName} field
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- file path ---
${url.fileURLToPath(mainFileUrlFirstCandidate)}
--- package.json path ---
${packageFilePath}
--- extensions tried ---
${extensionCandidateArray.join(`,`)}
        `);
    }

    return mainFileUrlFirstCandidate;
  }

  return mainFileUrl;
};

const findMainFileUrlOrNull = async mainFileUrl => {
  const mainFilePath = fileUrlToPath(mainFileUrl);
  const stats = await pathToStats(mainFilePath);

  if (stats === null) {
    const extension = path.extname(mainFilePath);

    if (extension === "") {
      const extensionLeadingToAFile = await findExtension(mainFilePath);

      if (extensionLeadingToAFile === null) {
        return null;
      }

      return `${mainFileUrl}.${extensionLeadingToAFile}`;
    }

    return null;
  }

  if (stats.isFile()) {
    return mainFileUrl;
  }

  if (stats.isDirectory()) {
    const indexFileUrl = resolveUrl("./index", mainFileUrl.endsWith("/") ? mainFileUrl : `${mainFileUrl}/`);
    const extensionLeadingToAFile = await findExtension(fileUrlToPath(indexFileUrl));

    if (extensionLeadingToAFile === null) {
      return null;
    }

    return `${indexFileUrl}.${extensionLeadingToAFile}`;
  }

  return null;
};

const findExtension = async path$1 => {
  const pathDirname = path.dirname(path$1);
  const pathBasename = path.basename(path$1);
  const extensionLeadingToFile = await firstOperationMatching({
    array: extensionCandidateArray,
    start: async extensionCandidate => {
      const pathCandidate = `${pathDirname}/${pathBasename}.${extensionCandidate}`;
      const stats = await pathToStats(pathCandidate);
      return stats && stats.isFile() ? extensionCandidate : null;
    },
    predicate: extension => Boolean(extension)
  });
  return extensionLeadingToFile || null;
};

const pathToStats = path => {
  return new Promise((resolve, reject) => {
    fs.stat(path, (error, statObject) => {
      if (error) {
        if (error.code === "ENOENT") resolve(null);else reject(error);
      } else {
        resolve(statObject);
      }
    });
  });
};

const visitPackageImports = ({
  logger,
  packageFileUrl,
  packageJsonObject
}) => {
  const importsForPackageImports = {};
  const packageFilePath = fileUrlToPath(packageFileUrl);
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
    if (hasScheme(specifier) || specifier.startsWith("//") || specifier.startsWith("../")) {
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

    if (hasScheme(address) || address.startsWith("//") || address.startsWith("../")) {
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

// documented in https://nodejs.org/dist/latest-v13.x/docs/api/esm.html#esm_package_exports

const visitPackageExports = ({
  logger,
  packageFileUrl,
  packageName,
  packageJsonObject,
  packageInfo: {
    packageIsRoot,
    packageDirectoryRelativePath
  },
  // maybe should depend on package.json field type
  // "module" -> "default"
  // "commonjs" -> "required"
  // undefined -> "default"
  packageExportCondition = "default"
}) => {
  const importsForPackageExports = {};

  if (packageIsRoot) {
    return importsForPackageExports;
  }

  const packageFilePath = fileUrlToPath(packageFileUrl);
  const {
    exports: rawPackageExports
  } = packageJsonObject;

  if (typeof rawPackageExports !== "object" || rawPackageExports === null) {
    if (rawPackageExports === false) return importsForPackageExports;
    logger.warn(`
exports of package.json must be an object.
--- package.json exports ---
${rawPackageExports}
--- package.json path ---
${packageFilePath}
`);
    return importsForPackageExports;
  }

  const packageExports = packageExportCondition in rawPackageExports ? rawPackageExports[packageExportCondition] : rawPackageExports;
  Object.keys(packageExports).forEach(specifier => {
    if (hasScheme(specifier) || specifier.startsWith("//") || specifier.startsWith("../")) {
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
      if (packageExportCondition in value === false) {
        return;
      }

      address = value[packageExportCondition];
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

    if (hasScheme(address) || address.startsWith("//") || address.startsWith("../")) {
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

    if (specifier[0] === "/") {
      from = specifier;
    } else if (specifier.startsWith("./")) {
      from = `${packageName}${specifier.slice(1)}`;
    } else {
      from = `${packageName}/${specifier}`;
    }

    let to;

    if (address[0] === "/") {
      to = address;
    } else if (address.startsWith("./")) {
      to = `${packageDirectoryRelativePath}${address.slice(2)}`;
    } else {
      to = `${packageDirectoryRelativePath}${address}`;
    }

    importsForPackageExports[from] = to;
  });
  return importsForPackageExports;
};

/* eslint-disable import/max-dependencies */
const generateImportMapForPackage = async ({
  logger,
  projectDirectoryPath,
  rootProjectDirectoryPath = projectDirectoryPath,
  includeDevDependencies = false,
  includeExports,
  includeImports,
  packageExportCondition
}) => {
  const projectDirectoryUrl = pathToDirectoryUrl(projectDirectoryPath);
  const rootProjectDirectoryUrl = pathToDirectoryUrl(rootProjectDirectoryPath);
  const projectPackageFileUrl = directoryUrlToPackageFileUrl(projectDirectoryUrl);
  const rootProjectPackageFileUrl = directoryUrlToPackageFileUrl(rootProjectDirectoryUrl);
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
    includeDevDependencies
  }) => {
    await visitPackage({
      packageFileUrl,
      packageName,
      packageJsonObject,
      importerPackageFileUrl
    });
    await visitDependencies({
      packageFileUrl,
      packageJsonObject,
      includeDevDependencies
    });
  };

  const visitPackage = async ({
    packageFileUrl,
    packageName,
    packageJsonObject,
    importerPackageFileUrl
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

    if (includeImports && "imports" in packageJsonObject) {
      const importsForPackageImports = visitPackageImports({
        packageFileUrl,
        packageName,
        packageJsonObject,
        packageInfo
      });
      const {
        packageIsRoot,
        packageDirectoryRelativePath
      } = packageInfo;
      Object.keys(importsForPackageImports).forEach(from => {
        const to = importsForPackageImports[from];

        if (packageIsRoot) {
          addImportMapping({
            from,
            to
          });
        } else {
          const toScoped = to[0] === "/" ? to : `${packageDirectoryRelativePath}${to.startsWith("./") ? to.slice(2) : to}`;
          addScopedImportMapping({
            scope: packageDirectoryRelativePath,
            from,
            to: toScoped
          }); // when a package says './' maps to './'
          // we must add something to say if we are already inside the package
          // no need to ensure leading slash are scoped to the package

          if (from === "./" && to === "./") {
            addScopedImportMapping({
              scope: packageDirectoryRelativePath,
              from: packageDirectoryRelativePath,
              to: packageDirectoryRelativePath
            });
          } else if (from === "/" && to === "/") {
            addScopedImportMapping({
              scope: packageDirectoryRelativePath,
              from: packageDirectoryRelativePath,
              to: packageDirectoryRelativePath
            });
          }
        }
      });
    }

    if (includeExports && "exports" in packageJsonObject) {
      const importsForPackageExports = visitPackageExports({
        packageFileUrl,
        packageName,
        packageJsonObject,
        packageInfo,
        packageExportCondition
      });
      const {
        importerIsRoot,
        importerRelativePath,
        packageDirectoryUrl,
        packageDirectoryUrlExpected
      } = packageInfo;
      Object.keys(importsForPackageExports).forEach(from => {
        const to = importsForPackageExports[from];

        if (importerIsRoot) {
          addImportMapping({
            from,
            to
          });
        } else {
          addScopedImportMapping({
            scope: importerRelativePath,
            from,
            to
          });
        }

        if (packageDirectoryUrl !== packageDirectoryUrlExpected) {
          addScopedImportMapping({
            scope: importerRelativePath,
            from,
            to
          });
        }
      });
    }
  };

  const visitPackageMain = async ({
    packageFileUrl,
    packageName,
    packageJsonObject,
    packageInfo: {
      importerIsRoot,
      importerRelativePath,
      packageIsRoot,
      packageIsProject,
      packageDirectoryUrl,
      packageDirectoryUrlExpected
    }
  }) => {
    if (packageIsRoot) return;
    if (packageIsProject) return;
    const mainFileUrl = await resolvePackageMain({
      packageFileUrl,
      packageJsonObject,
      logger
    }); // it's possible to have no main
    // like { main: "" } in package.json
    // or a main that does not lead to an actual file

    if (mainFileUrl === null) return;
    const mainFileRelativePath = fileUrlToRelativePath(mainFileUrl, rootProjectDirectoryUrl);
    const from = packageName;
    const to = mainFileRelativePath;

    if (importerIsRoot) {
      addImportMapping({
        from,
        to
      });
    } else {
      addScopedImportMapping({
        scope: importerRelativePath,
        from,
        to
      });
    }

    if (packageDirectoryUrl !== packageDirectoryUrlExpected) {
      addScopedImportMapping({
        scope: importerRelativePath,
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
    } = packageJsonObject;
    Object.keys(dependencies).forEach(dependencyName => {
      dependencyMap[dependencyName] = {
        type: "dependency",
        versionPattern: dependencies[dependencyName]
      };
    });
    const {
      peerDependencies = {}
    } = packageJsonObject;
    Object.keys(peerDependencies).forEach(dependencyName => {
      dependencyMap[dependencyName] = {
        type: "peerDependency",
        versionPattern: peerDependencies[dependencyName]
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
        dependencyVersionPattern: dependency.versionPattern
      });
    }));
  };

  const visitDependency = async ({
    packageFileUrl,
    packageJsonObject,
    dependencyName,
    dependencyType,
    dependencyVersionPattern
  }) => {
    const dependencyData = await findDependency({
      packageFileUrl,
      packageJsonObject,
      dependencyName,
      dependencyType,
      dependencyVersionPattern
    });

    if (!dependencyData) {
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
      importerPackageFileUrl: packageFileUrl
    });
  };

  const computePackageInfo = ({
    packageFileUrl,
    packageName,
    importerPackageFileUrl
  }) => {
    const importerIsRoot = importerPackageFileUrl === rootProjectPackageFileUrl;
    const importerIsProject = importerPackageFileUrl === projectPackageFileUrl;
    const importerPackageDirectoryUrl = fileUrlToDirectoryUrl(importerPackageFileUrl);
    const importerRelativePath = importerIsRoot ? `./${path.basename(rootProjectDirectoryUrl)}/` : fileUrlToRelativePath(importerPackageDirectoryUrl, rootProjectDirectoryUrl);
    const packageIsRoot = packageFileUrl === rootProjectPackageFileUrl;
    const packageIsProject = packageFileUrl === projectPackageFileUrl;
    const packageDirectoryUrl = fileUrlToDirectoryUrl(packageFileUrl);
    let packageDirectoryUrlExpected;

    if (packageIsProject && !packageIsRoot) {
      packageDirectoryUrlExpected = importerPackageDirectoryUrl;
    } else {
      packageDirectoryUrlExpected = `${importerPackageDirectoryUrl}node_modules/${packageName}/`;
    }

    const packageDirectoryRelativePath = fileUrlToRelativePath(packageDirectoryUrl, rootProjectDirectoryUrl);
    return {
      importerIsRoot,
      importerIsProject,
      importerRelativePath,
      packageIsRoot,
      packageIsProject,
      packageDirectoryUrl,
      packageDirectoryUrlExpected,
      packageDirectoryRelativePath
    };
  };

  const addImportMapping = ({
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
    packageJsonObject,
    dependencyName,
    dependencyType,
    dependencyVersionPattern
  }) => {
    if (packageFileUrl in dependenciesCache === false) {
      dependenciesCache[packageFileUrl] = {};
    }

    if (dependencyName in dependenciesCache[packageFileUrl]) {
      return dependenciesCache[packageFileUrl][dependencyName];
    }

    const dependencyPromise = resolveNodeModule({
      rootProjectDirectoryUrl,
      packageFileUrl,
      packageJsonObject,
      dependencyName,
      dependencyType,
      dependencyVersionPattern,
      logger
    });
    dependenciesCache[packageFileUrl][dependencyName] = dependencyPromise;
    return dependencyPromise;
  };

  const projectPackageJsonObject = await readPackageFile(fileUrlToPath(projectPackageFileUrl));
  const packageFileUrl = projectPackageFileUrl;
  const importerPackageFileUrl = projectPackageFileUrl;
  markPackageAsSeen(packageFileUrl, importerPackageFileUrl);
  await visit({
    packageFileUrl,
    packageName: projectPackageJsonObject.name,
    packageJsonObject: projectPackageJsonObject,
    importerPackageFileUrl,
    includeDevDependencies
  });
  return sortImportMap({
    imports,
    scopes
  });
};

const LOG_LEVEL_OFF = "off";
const LOG_LEVEL_DEBUG = "debug";
const LOG_LEVEL_INFO = "info";
const LOG_LEVEL_WARN = "warn";
const LOG_LEVEL_ERROR = "error";

const createLogger = ({
  logLevel = LOG_LEVEL_INFO
} = {}) => {
  if (logLevel === LOG_LEVEL_DEBUG) {
    return {
      debug,
      info,
      warn,
      error
    };
  }

  if (logLevel === LOG_LEVEL_INFO) {
    return {
      debug: debugDisabled,
      info,
      warn,
      error
    };
  }

  if (logLevel === LOG_LEVEL_WARN) {
    return {
      debug: debugDisabled,
      info: infoDisabled,
      warn,
      error
    };
  }

  if (logLevel === LOG_LEVEL_ERROR) {
    return {
      debug: debugDisabled,
      info: infoDisabled,
      warn: warnDisabled,
      error
    };
  }

  if (logLevel === LOG_LEVEL_OFF) {
    return {
      debug: debugDisabled,
      info: infoDisabled,
      warn: warnDisabled,
      error: errorDisabled
    };
  }

  throw new Error(createUnexpectedLogLevelMessage({
    logLevel
  }));
};

const createUnexpectedLogLevelMessage = ({
  logLevel
}) => `unexpected logLevel.
--- logLevel ---
${logLevel}
--- allowed log levels ---
${LOG_LEVEL_OFF}
${LOG_LEVEL_ERROR}
${LOG_LEVEL_WARN}
${LOG_LEVEL_INFO}
${LOG_LEVEL_DEBUG}
`;

const debug = console.debug;

const debugDisabled = () => {};

const info = console.info;

const infoDisabled = () => {};

const warn = console.warn;

const warnDisabled = () => {};

const error = console.error;

const errorDisabled = () => {};

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

const generateImportMapForProjectPackage = async ({
  logLevel,
  projectDirectoryPath,
  inputImportMap,
  includeDevDependencies,
  includeExports = false,
  packageExportCondition,
  includeImports = false,
  importMapFile = false,
  importMapFileRelativeUrl = "./importMap.json",
  importMapFileLog = true,
  jsConfigFile = false,
  jsConfigFileLog = true,
  jsConfigLeadingSlash = false
}) => catchAsyncFunctionCancellation(async () => {
  const logger = createLogger({
    logLevel
  });
  const projectPackageImportMap = await generateImportMapForPackage({
    projectDirectoryPath,
    includeDevDependencies,
    includeExports,
    includeImports,
    packageExportCondition,
    logger
  });
  const importMap = inputImportMap ? composeTwoImportMaps(inputImportMap, projectPackageImportMap) : projectPackageImportMap;

  if (importMapFile) {
    const projectDirectoryUrl = pathToDirectoryUrl(projectDirectoryPath);
    const importMapFileUrl = resolveUrl(importMapFileRelativeUrl, projectDirectoryUrl);
    const importMapFilePath = fileUrlToPath(importMapFileUrl);
    await writeFileContent(importMapFilePath, JSON.stringify(importMap, null, "  "));

    if (importMapFileLog) {
      logger.info(`-> ${importMapFilePath}`);
    }
  }

  if (jsConfigFile) {
    const projectDirectoryUrl = pathToDirectoryUrl(projectDirectoryPath);
    const jsConfigFileUrl = resolveUrl("./jsconfig.json", projectDirectoryUrl);
    const jsConfigFilePath = fileUrlToPath(jsConfigFileUrl);

    try {
      const jsConfig = {
        compilerOptions: {
          baseUrl: ".",
          paths: { ...(jsConfigLeadingSlash ? {
              "/*": ["./*"]
            } : {}),
            ...importMapToVsCodeConfigPaths(importMap)
          }
        }
      };
      await writeFileContent(jsConfigFilePath, JSON.stringify(jsConfig, null, "  "));

      if (jsConfigFileLog) {
        logger.info(`-> ${jsConfigFilePath}`);
      }
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw e;
      }
    }
  }

  return importMap;
});

const writeFileContent = (path, content) => new Promise((resolve, reject) => {
  fs.writeFile(path, content, error => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
});

exports.generateImportMapForPackage = generateImportMapForPackage;
exports.generateImportMapForProjectPackage = generateImportMapForProjectPackage;
//# sourceMappingURL=main.js.map
