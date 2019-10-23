'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var util = require('util');
var fs = require('fs');

const startsWithWindowsDriveLetter = string => {
  const firstChar = string[0];
  if (!/[a-zA-Z]/.test(firstChar)) return false;
  const secondChar = string[1];
  if (secondChar !== ":") return false;
  return true;
};

const replaceSlashesWithBackSlashes = string => string.replace(/\//g, "\\");

const pathnameToOperatingSystemPath = pathname => {
  if (pathname[0] !== "/") throw new Error(`pathname must start with /, got ${pathname}`);
  const pathnameWithoutLeadingSlash = pathname.slice(1);

  if (startsWithWindowsDriveLetter(pathnameWithoutLeadingSlash) && pathnameWithoutLeadingSlash[2] === "/") {
    return replaceSlashesWithBackSlashes(pathnameWithoutLeadingSlash);
  } // linux mac pathname === operatingSystemFilename


  return pathname;
};

const isWindowsPath = path => startsWithWindowsDriveLetter(path) && path[2] === "\\";

const replaceBackSlashesWithSlashes = string => string.replace(/\\/g, "/");

const operatingSystemPathToPathname = operatingSystemPath => {
  if (isWindowsPath(operatingSystemPath)) {
    return `/${replaceBackSlashesWithSlashes(operatingSystemPath)}`;
  } // linux and mac operatingSystemFilename === pathname


  return operatingSystemPath;
};

const pathnameToRelativePathname = (pathname, otherPathname) => pathname.slice(otherPathname.length);

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

const pathnameToDirname = pathname => {
  const slashLastIndex = pathname.lastIndexOf("/");
  if (slashLastIndex === -1) return "";
  return pathname.slice(0, slashLastIndex);
};

// certainly needs to be moved to @dmail/cancellation
const firstOperationMatching = ({
  array,
  start,
  predicate
}) => {
  if (typeof array !== "object") throw new TypeError(createArrayErrorMessage({
    array
  }));
  if (typeof start !== "function") throw new TypeError(createStartErrorMessage({
    start
  }));
  if (typeof predicate !== "function") throw new TypeError(createPredicateErrorMessage({
    predicate
  }));
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

const createArrayErrorMessage = ({
  array
}) => `array must be an object.
array: ${array}`;

const createStartErrorMessage = ({
  start
}) => `start must be a function.
start: ${start}`;

const createPredicateErrorMessage = ({
  predicate
}) => `predicate must be a function.
predicate: ${predicate}`;

const promiseSequence = async callbackArray => {
  const values = [];

  const visit = async index => {
    if (index === callbackArray.length) return;
    const callback = callbackArray[index];
    const value = await callback();
    values.push(value);
    await visit(index + 1);
  };

  await visit(0);
  return values;
};

// export const ensureFolderLeadingTo = (file) => {
//   return new Promise((resolve, reject) => {
//     fs.mkdir(path.dirname(file), { resurcive: true }, (error) => {
//       if (error) {
//         if (error.code === "EEXIST") {
//           resolve()
//           return
//         }
//         reject(error)
//         return
//       }
//       resolve()
//     })
//   })
// }

const fileMakeDirname = file => {
  const fileNormalized = normalizeSeparation(file); // remove first / in case path starts with / (linux)
  // because it would create a "" entry in folders array below
  // tryig to create a folder at ""

  const fileStartsWithSlash = fileNormalized[0] === "/";
  const pathname = fileStartsWithSlash ? fileNormalized.slice(1) : fileNormalized;
  const folders = pathname.split("/");
  folders.pop();
  return promiseSequence(folders.map((_, index) => {
    return () => {
      const folder = folders.slice(0, index + 1).join("/");
      return folderMake(`${fileStartsWithSlash ? "/" : ""}${folder}`);
    };
  }));
};

const normalizeSeparation = file => file.replace(/\\/g, "/");

const folderMake = folder => new Promise((resolve, reject) => {
  fs.mkdir(folder, async error => {
    if (error) {
      // au cas ou deux script essayent de crée un dossier peu importe qui y arrive c'est ok
      if (error.code === "EEXIST") {
        const stat = await fileLastStat(folder);

        if (stat.isDirectory()) {
          resolve();
        } else {
          reject({
            status: 500,
            reason: "expect a directory"
          });
        }
      } else {
        reject({
          status: 500,
          reason: error.code
        });
      }
    } else {
      resolve();
    }
  });
});

const fileLastStat = path => new Promise((resolve, reject) => {
  fs.lstat(path, (error, lstat) => {
    if (error) {
      reject({
        status: 500,
        reason: error.code
      });
    } else {
      resolve(lstat);
    }
  });
});

const copyFilePromisified = util.promisify(fs.copyFile);

const readFilePromisified = util.promisify(fs.readFile);
const fileRead = async file => {
  const buffer = await readFilePromisified(file);
  return buffer.toString();
};

const statPromisified = util.promisify(fs.stat);

const lstatPromisified = util.promisify(fs.lstat);

const writeFilePromisified = util.promisify(fs.writeFile);
const fileWrite = async (file, content) => {
  await fileMakeDirname(file);
  return writeFilePromisified(file, content);
};

const readdirPromisified = util.promisify(fs.readdir);

const readPackageData = async ({
  path
}) => {
  const packageString = await fileRead(path);
  const packageData = JSON.parse(packageString);
  return packageData;
};

const resolveNodeModule = async ({
  rootPathname,
  packagePathname,
  packageData,
  dependencyName,
  dependencyVersionPattern,
  dependencyType,
  logger
}) => {
  const packageFolderPathname = pathnameToDirname(packagePathname);
  const packageFolderRelativePath = pathnameToRelativePathname(packageFolderPathname, rootPathname);
  const nodeModuleCandidateArray = [...getCandidateArrayFromPackageFolder(packageFolderRelativePath), `node_modules`];
  const result = await firstOperationMatching({
    array: nodeModuleCandidateArray,
    start: async nodeModuleCandidate => {
      const packagePathname = `${rootPathname}/${nodeModuleCandidate}/${dependencyName}/package.json`;

      try {
        const packageData = await readPackageData({
          path: pathnameToOperatingSystemPath(packagePathname)
        });
        return {
          packagePathname,
          packageData
        };
      } catch (e) {
        if (e.code === "ENOENT") {
          return {};
        }

        if (e.name === "SyntaxError") {
          logger.error(writeDependencyPackageParsingError({
            parsingError: e,
            packagePathname
          }));
          return {};
        }

        throw e;
      }
    },
    predicate: ({
      packageData
    }) => Boolean(packageData)
  });

  if (!result) {
    logger.warn(writeDendencyNotFound({
      dependencyName,
      dependencyType,
      dependencyVersionPattern,
      packagePathname,
      packageData
    }));
  }

  return result;
};

const getCandidateArrayFromPackageFolder = packageFolderRelativePath => {
  if (packageFolderRelativePath === "") return [];
  const candidateArray = [];
  const relativeFolderNameArray = packageFolderRelativePath.split("/node_modules/"); // remove the first empty string

  relativeFolderNameArray.shift();
  let i = relativeFolderNameArray.length;

  while (i--) {
    candidateArray.push(`node_modules/${relativeFolderNameArray.slice(0, i + 1).join("/node_modules/")}/node_modules`);
  }

  return candidateArray;
};

const writeDependencyPackageParsingError = ({
  parsingError,
  packagePathname
}) => `
error while parsing dependency package.json.
--- parsing error message ---
${parsingError.message}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`;

const writeDendencyNotFound = ({
  dependencyName,
  dependencyType,
  dependencyVersionPattern,
  packageData,
  packagePathname
}) => `
cannot find a ${dependencyType}.
--- ${dependencyType} ---
${dependencyName}@${dependencyVersionPattern}
--- required by ---
${packageData.name}@${packageData.version}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`;

const hasScheme = string => {
  return /^[a-zA-Z]{2,}:/.test(string);
};

const resolvePackageMain = ({
  packageData,
  packagePathname,
  logger
}) => {
  if ("module" in packageData) {
    return resolveMainFile({
      packagePathname,
      logger,
      packageMainFieldName: "module",
      packageMainFieldValue: packageData.module
    });
  }

  if ("jsnext:main" in packageData) {
    return resolveMainFile({
      packagePathname,
      logger,
      packageMainFieldName: "jsnext:main",
      packageMainFieldValue: packageData["jsnext:main"]
    });
  }

  if ("main" in packageData) {
    return resolveMainFile({
      packagePathname,
      logger,
      packageMainFieldName: "main",
      packageMainFieldValue: packageData.main
    });
  }

  return resolveMainFile({
    packagePathname,
    logger,
    packageMainFieldName: "default",
    packageMainFieldValue: "index"
  });
};
const extensionCandidateArray = ["js", "json", "node"];

const resolveMainFile = async ({
  packagePathname,
  logger,
  packageMainFieldName,
  packageMainFieldValue
}) => {
  // main is explicitely empty meaning
  // it is assumed that we should not find a file
  if (packageMainFieldValue === "") {
    return null;
  }

  if (hasScheme(packageMainFieldValue) || packageMainFieldValue.startsWith("//") || packageMainFieldValue.startsWith("../")) {
    logger.warn(writePackageMainFieldMustBeInside({
      packagePathname,
      packageMainFieldName,
      packageMainFieldValue
    }));
    return null;
  }

  let mainRelativePath;

  if (packageMainFieldValue.slice(0, 2) === "./") {
    mainRelativePath = packageMainFieldValue.slice(1);
  } else if (packageMainFieldValue[0] === "/") {
    mainRelativePath = packageMainFieldValue;
  } else {
    mainRelativePath = `/${packageMainFieldValue}`;
  }

  if (packageMainFieldValue.endsWith("/")) {
    mainRelativePath += `index`;
  }

  const packageDirname = pathnameToDirname(packagePathname);
  const mainFilePathnameFirstCandidate = `${packageDirname}${mainRelativePath}`;
  const mainFilePathname = await findMainFilePathnameOrNull(mainFilePathnameFirstCandidate);

  if (mainFilePathname === null) {
    // we know in advance this remapping does not lead to an actual file.
    // we only warn because we have no guarantee this remapping will actually be used
    // in the codebase.
    // warn only if there is actually a main field
    // otherwise the package.json is missing the main field
    // it certainly means it's not important
    if (packageMainFieldName !== "default") {
      logger.warn(writePackageMainFileNotFound({
        packagePathname,
        packageMainFieldName,
        packageMainFieldValue,
        mainFilePath: pathnameToOperatingSystemPath(mainFilePathnameFirstCandidate)
      }));
    }

    return `${mainRelativePath}.js`;
  }

  return pathnameToRelativePathname(mainFilePathname, packageDirname);
};

const findMainFilePathnameOrNull = async mainFilePathname => {
  const mainFilePath = pathnameToOperatingSystemPath(mainFilePathname);
  const stats = await pathToStats(mainFilePath);

  if (stats === null) {
    const extension = path.extname(mainFilePathname);

    if (extension === "") {
      const extensionLeadingToAFile = await findExtension(mainFilePathname);

      if (extensionLeadingToAFile === null) {
        return null;
      }

      return `${mainFilePathname}.${extensionLeadingToAFile}`;
    }

    return null;
  }

  if (stats.isFile()) {
    return mainFilePathname;
  }

  if (stats.isDirectory()) {
    mainFilePathname += mainFilePathname.endsWith("/") ? `index` : `/index`;
    const extensionLeadingToAFile = await findExtension(mainFilePathname);

    if (extensionLeadingToAFile === null) {
      return null;
    }

    return `${mainFilePathname}.${extensionLeadingToAFile}`;
  }

  return null;
};

const findExtension = async pathname => {
  const dirname = pathnameToDirname(pathname);
  const filename = path.basename(pathname);
  const extensionLeadingToFile = await firstOperationMatching({
    array: extensionCandidateArray,
    start: async extensionCandidate => {
      const pathCandidate = pathnameToOperatingSystemPath(`${dirname}/${filename}.${extensionCandidate}`);
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

const writePackageMainFieldMustBeInside = ({
  packagePathname,
  packageMainFieldName,
  packageMainFieldValue
}) => `
${packageMainFieldName} field in package.json must be inside package.json folder.
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`;

const writePackageMainFileNotFound = ({
  packagePathname,
  packageMainFieldName,
  packageMainFieldValue,
  mainFilePath
}) => `
cannot find file for package.json ${packageMainFieldName} field
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- file path ---
${mainFilePath}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
--- extensions tried ---
${extensionCandidateArray.join(`,`)}
`;

const visitPackageImports = ({
  logger,
  packagePathname,
  packageData
}) => {
  const importsForPackageImports = {};
  const {
    imports: packageImports
  } = packageData;

  if (typeof packageImports !== "object" || packageImports === null) {
    logger.warn(writeImportsMustBeObject({
      packagePathname,
      packageImports
    }));
    return importsForPackageImports;
  }

  Object.keys(packageImports).forEach(specifier => {
    if (hasScheme(specifier) || specifier.startsWith("//") || specifier.startsWith("../")) {
      logger.warn(writeSpecifierMustBeRelative({
        packagePathname,
        specifier
      }));
      return;
    }

    const address = packageImports[specifier];

    if (typeof address !== "string") {
      logger.warn(writeAddressMustBeString({
        packagePathname,
        specifier,
        address
      }));
      return;
    }

    if (hasScheme(address) || address.startsWith("//") || address.startsWith("../")) {
      logger.warn(writeAddressMustBeRelative({
        packagePathname,
        specifier,
        address
      }));
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

const writeImportsMustBeObject = ({
  packagePathname,
  packageImports
}) => `
imports of package.json must be an object.
--- package.json imports ---
${packageImports}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`;

const writeAddressMustBeString = ({
  packagePathname,
  specifier,
  address
}) => `
found unexpected address in imports of package.json, it must be a string.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`;

const writeSpecifierMustBeRelative = ({
  packagePathname,
  specifier
}) => `
found unexpected specifier in imports of package.json, it must be relative to package.json.
--- specifier ---
${specifier}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`;

const writeAddressMustBeRelative = ({
  packagePathname,
  specifier,
  address
}) => `
found unexpected address in imports of package.json, it must be relative to package.json.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`;

const visitPackageExports = ({
  logger,
  packagePathname,
  packageName,
  packageData,
  packagePathInfo: {
    packageIsRoot,
    actualRelativePath
  }
}) => {
  const importsForPackageExports = {};

  if (packageIsRoot) {
    return importsForPackageExports;
  }

  const {
    exports: packageExports
  } = packageData;

  if (typeof packageExports !== "object" || packageExports === null) {
    logger.warn(writeExportsMustBeAnObject({
      packageExports,
      packagePathname
    }));
    return importsForPackageExports;
  }

  Object.keys(packageExports).forEach(specifier => {
    if (hasScheme(specifier) || specifier.startsWith("//") || specifier.startsWith("../")) {
      logger.warn(writeSpecifierMustBeRelative$1({
        packagePathname,
        specifier
      }));
      return;
    }

    const address = packageExports[specifier];

    if (typeof address !== "string") {
      logger.warn(writeAddressMustBeString$1({
        packagePathname,
        specifier,
        address
      }));
      return;
    }

    if (hasScheme(address) || address.startsWith("//") || address.startsWith("../")) {
      logger.warn(writeAddressMustBeRelative$1({
        packagePathname,
        specifier,
        address
      }));
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
      to = `.${actualRelativePath}${address.slice(1)}`;
    } else {
      to = `.${actualRelativePath}/${address}`;
    }

    importsForPackageExports[from] = to;
  });
  return importsForPackageExports;
};

const writeExportsMustBeAnObject = ({
  packagePathname,
  packageExports
}) => `
exports of package.json must be an object.
--- package.json exports ---
${packageExports}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`;

const writeSpecifierMustBeRelative$1 = ({
  packagePathname,
  specifier
}) => `
found unexpected specifier in exports of package.json, it must be relative to package.json.
--- specifier ---
${specifier}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`;

const writeAddressMustBeString$1 = ({
  packagePathname,
  specifier,
  address
}) => `
found unexpected address in exports of package.json, it must be a string.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`;

const writeAddressMustBeRelative$1 = ({
  packagePathname,
  specifier,
  address
}) => `
found unexpected address in exports of package.json, it must be relative to package.json.
--- address ---
${address}
--- specifier ---
${specifier}
--- package.json path ---
${pathnameToOperatingSystemPath(packagePathname)}
`;

/* eslint-disable import/max-dependencies */
const generateImportMapForPackage = async ({
  projectPath,
  rootProjectPath = projectPath,
  includeDevDependencies = false,
  logger
}) => {
  const projectPathname = operatingSystemPathToPathname(projectPath);
  const projectPackagePathname = `${projectPathname}/package.json`;
  const rootProjectPathname = operatingSystemPathToPathname(rootProjectPath);
  const rootImporterName = path.basename(rootProjectPathname);
  const rootPackagePathname = `${rootProjectPathname}/package.json`;
  const imports = {};
  const scopes = {};
  const seen = {};

  const markPackageAsSeen = (packagePathname, importerPackagePathname) => {
    if (packagePathname in seen) {
      seen[packagePathname].push(importerPackagePathname);
    } else {
      seen[packagePathname] = [importerPackagePathname];
    }
  };

  const packageIsSeen = (packagePathname, importerPackagePathname) => {
    return packagePathname in seen && seen[packagePathname].includes(importerPackagePathname);
  };

  const visit = async ({
    packagePathname,
    packageData,
    includeDevDependencies,
    packageName,
    importerPackagePathname
  }) => {
    await visitPackage({
      packagePathname,
      packageData,
      packageName,
      importerPackagePathname
    });
    await visitDependencies({
      packagePathname,
      packageData,
      includeDevDependencies
    });
  };

  const visitPackage = async ({
    packagePathname,
    packageData,
    packageName,
    importerPackagePathname
  }) => {
    const packagePathInfo = computePackagePathInfo({
      packagePathname,
      packageName,
      importerPackagePathname
    });
    await visitPackageMain({
      packagePathname,
      packageName,
      packageData,
      packagePathInfo
    });

    if ("imports" in packageData) {
      const importsForPackageImports = visitPackageImports({
        packagePathname,
        packageName,
        packageData,
        packagePathInfo
      });
      const {
        packageIsRoot,
        actualRelativePath
      } = packagePathInfo;
      Object.keys(importsForPackageImports).forEach(from => {
        const to = importsForPackageImports[from];

        if (packageIsRoot) {
          addImportMapping({
            from,
            to
          });
        } else {
          const toScoped = to[0] === "/" ? to : `.${actualRelativePath}${to.startsWith("./") ? to.slice(1) : `/${to}`}`;
          addScopedImportMapping({
            scope: `.${actualRelativePath}/`,
            from,
            to: toScoped
          }); // when a package says './' maps to './'
          // we must add something to say if we are already inside the package
          // no need to ensure leading slash are scoped to the package

          if (from === "./" && to === "./") {
            addScopedImportMapping({
              scope: `.${actualRelativePath}/`,
              from: `.${actualRelativePath}/`,
              to: `.${actualRelativePath}/`
            });
          } else if (from === "/" && to === "/") {
            addScopedImportMapping({
              scope: `.${actualRelativePath}/`,
              from: `.${actualRelativePath}/`,
              to: `.${actualRelativePath}/`
            });
          }
        }
      });
    }

    if ("exports" in packageData) {
      const importsForPackageExports = visitPackageExports({
        packagePathname,
        packageName,
        packageData,
        packagePathInfo
      });
      const {
        importerName,
        actualRelativePath,
        expectedRelativePath
      } = packagePathInfo;
      Object.keys(importsForPackageExports).forEach(from => {
        const to = importsForPackageExports[from];

        if (importerName === rootImporterName) {
          addImportMapping({
            from,
            to
          });
        } else {
          addScopedImportMapping({
            scope: `./${importerName}/`,
            from,
            to
          });
        }

        if (actualRelativePath !== expectedRelativePath) {
          addScopedImportMapping({
            scope: `./${importerName}/`,
            from,
            to
          });
        }
      });
    }
  };

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
      expectedRelativePath
    }
  }) => {
    if (packageIsRoot) return;
    if (packageIsProject) return;
    const mainRelativePath = await resolvePackageMain({
      packagePathname,
      packageData,
      logger
    }); // it's possible to have no main
    // like { main: "" } in package.json
    // or a main that does not lead to an actual file

    if (!mainRelativePath) return;
    const from = packageName;
    const to = `.${actualRelativePath}${mainRelativePath}`;

    if (importerPackageIsRoot) {
      addImportMapping({
        from,
        to
      });
    } else {
      addScopedImportMapping({
        scope: `./${importerName}/`,
        from,
        to
      });
    }

    if (actualRelativePath !== expectedRelativePath) {
      addScopedImportMapping({
        scope: `./${importerName}/`,
        from,
        to
      });
    }
  };

  const visitDependencies = async ({
    packagePathname,
    packageData,
    includeDevDependencies
  }) => {
    const dependencyMap = {};
    const {
      dependencies = {}
    } = packageData;
    Object.keys(dependencies).forEach(dependencyName => {
      dependencyMap[dependencyName] = {
        type: "dependency",
        versionPattern: dependencies[dependencyName]
      };
    });
    const {
      peerDependencies = {}
    } = packageData;
    Object.keys(peerDependencies).forEach(dependencyName => {
      dependencyMap[dependencyName] = {
        type: "peerDependency",
        versionPattern: peerDependencies[dependencyName]
      };
    });
    const isProjectPackage = packagePathname === projectPackagePathname;

    if (includeDevDependencies && isProjectPackage) {
      const {
        devDependencies = {}
      } = packageData;
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
        packagePathname,
        packageData,
        dependencyName,
        dependencyType: dependency.type,
        dependencyVersionPattern: dependency.versionPattern
      });
    }));
  };

  const visitDependency = async ({
    packagePathname,
    packageData,
    dependencyName,
    dependencyType,
    dependencyVersionPattern
  }) => {
    const dependencyData = await findDependency({
      packagePathname,
      packageData,
      dependencyName,
      dependencyType,
      dependencyVersionPattern
    });

    if (!dependencyData) {
      return;
    }

    const {
      packagePathname: dependencyPackagePathname,
      packageData: dependencyPackageData
    } = dependencyData;

    if (packageIsSeen(dependencyPackagePathname, packagePathname)) {
      return;
    }

    markPackageAsSeen(dependencyPackagePathname, packagePathname);
    await visit({
      packagePathname: dependencyPackagePathname,
      packageData: dependencyPackageData,
      packageName: dependencyName,
      importerPackagePathname: packagePathname
    });
  };

  const computePackagePathInfo = ({
    packagePathname,
    packageName,
    importerPackagePathname
  }) => {
    const packageIsRoot = packagePathname === rootPackagePathname;
    const packageIsProject = packagePathname === projectPackagePathname;
    const importerPackageIsRoot = importerPackagePathname === rootPackagePathname;
    const importerPackageIsProject = importerPackagePathname === projectPackagePathname;
    const importerName = importerPackageIsRoot ? rootImporterName : pathnameToDirname(pathnameToRelativePathname(importerPackagePathname, rootProjectPathname)).slice(1);
    const actualPathname = pathnameToDirname(packagePathname);
    const actualRelativePath = pathnameToRelativePathname(actualPathname, rootProjectPathname);
    let expectedPathname;

    if (packageIsProject && !packageIsRoot) {
      expectedPathname = pathnameToDirname(importerPackagePathname);
    } else {
      expectedPathname = `${pathnameToDirname(importerPackagePathname)}/node_modules/${packageName}`;
    }

    const expectedRelativePath = pathnameToRelativePathname(expectedPathname, rootProjectPathname);
    return {
      importerPackageIsRoot,
      importerPackageIsProject,
      importerName,
      packageIsRoot,
      packageIsProject,
      actualRelativePath,
      expectedRelativePath
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
    packagePathname,
    packageData,
    dependencyName,
    dependencyType,
    dependencyVersionPattern
  }) => {
    if (packagePathname in dependenciesCache === false) {
      dependenciesCache[packagePathname] = {};
    }

    if (dependencyName in dependenciesCache[packagePathname]) {
      return dependenciesCache[packagePathname][dependencyName];
    }

    const dependencyPromise = resolveNodeModule({
      rootPathname: rootProjectPathname,
      packagePathname,
      packageData,
      dependencyName,
      dependencyType,
      dependencyVersionPattern,
      logger
    });
    dependenciesCache[packagePathname][dependencyName] = dependencyPromise;
    return dependencyPromise;
  };

  const projectPackageData = await readPackageData({
    path: pathnameToOperatingSystemPath(projectPackagePathname)
  });
  markPackageAsSeen(projectPackagePathname, projectPackagePathname);
  await visit({
    packagePathname: projectPackagePathname,
    packageData: projectPackageData,
    includeDevDependencies,
    packageName: projectPackageData.name,
    importerPackagePathname: projectPackagePathname
  });
  return sortImportMap({
    imports,
    scopes
  });
};

const LOG_LEVEL_OFF = "off";
const LOG_LEVEL_ERROR = "error";
const LOG_LEVEL_WARN = "warn";
const LOG_LEVEL_INFO = "info";
const LOG_LEVEL_TRACE = "trace";

const createLogger = ({
  logLevel = LOG_LEVEL_INFO
} = {}) => {
  if (logLevel === LOG_LEVEL_TRACE) {
    return {
      trace,
      info,
      warn,
      error
    };
  }

  if (logLevel === LOG_LEVEL_INFO) {
    return {
      trace: traceDisabled,
      info,
      warn,
      error
    };
  }

  if (logLevel === LOG_LEVEL_WARN) {
    return {
      trace: traceDisabled,
      info: infoDisabled,
      warn,
      error
    };
  }

  if (logLevel === LOG_LEVEL_ERROR) {
    return {
      trace: traceDisabled,
      info: infoDisabled,
      warn: warnDisabled,
      error
    };
  }

  if (logLevel === LOG_LEVEL_OFF) {
    return {
      trace: traceDisabled,
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
${LOG_LEVEL_TRACE}
`;

const trace = console.trace;

const traceDisabled = () => {};

const info = console.log;

const infoDisabled = () => {};

const warn = console.warn;

const warnDisabled = () => {};

const error = console.error;

const errorDisabled = () => {};

// https://github.com/tc39/proposal-cancellation/tree/master/stage0
const isCancelError = value => {
  return value && typeof value === "object" && value.name === "CANCEL_ERROR";
};

const catchAsyncFunctionCancellation = asyncFunction => {
  return asyncFunction().catch(error => {
    if (isCancelError(error)) return;
    throw error;
  });
};

const importMapToVsCodeConfigPaths = ({
  imports = {}
}) => {
  const paths = {};

  const handleImportsAt = (pathPattern, remappingValue) => {
    let path;

    if (pathPattern.endsWith("/")) {
      path = `${pathPattern}*`;
    } else {
      path = pathPattern;
    }

    const remappingArray = typeof remappingValue === "string" ? [remappingValue] : remappingValue;
    const candidates = remappingArray.filter(remapping => !remapping.endsWith("/")).map(remapping => `.${remapping}`);

    if (candidates.length) {
      if (path in paths) {
        paths[path] = [...paths[path], ...candidates];
      } else {
        paths[path] = candidates;
      }
    }
  };

  Object.keys(imports).forEach(importPattern => {
    handleImportsAt(importPattern, imports[importPattern]);
  });
  return paths;
};

const generateImportMapForProjectPackage = async ({
  projectPath,
  inputImportMap,
  includeDevDependencies,
  logLevel,
  throwUnhandled = true,
  importMapFile = false,
  importMapFileRelativePath = "/importMap.json",
  importMapFileLog = true,
  jsConfigFile = false,
  jsConfigFileLog = true
}) => catchAsyncFunctionCancellation(async () => {
  const start = async () => {
    const logger = createLogger({
      logLevel
    });
    const projectPackageImportMap = await generateImportMapForPackage({
      projectPath,
      includeDevDependencies,
      logger
    });
    const importMap = inputImportMap ? composeTwoImportMaps(inputImportMap, projectPackageImportMap) : projectPackageImportMap;

    if (importMapFile) {
      const projectPathname = operatingSystemPathToPathname(projectPath);
      const importMapPath = pathnameToOperatingSystemPath(`${projectPathname}${importMapFileRelativePath}`);
      await fileWrite(importMapPath, JSON.stringify(importMap, null, "  "));

      if (importMapFileLog) {
        logger.info(`-> ${importMapPath}`);
      }
    }

    if (jsConfigFile) {
      const projectPathname = operatingSystemPathToPathname(projectPath);
      const jsConfigPath = pathnameToOperatingSystemPath(`${projectPathname}/jsconfig.json`);

      try {
        const jsConfig = {
          compilerOptions: {
            baseUrl: ".",
            paths: {
              "/*": ["./*"],
              ...importMapToVsCodeConfigPaths(importMap)
            }
          }
        };
        await fileWrite(jsConfigPath, JSON.stringify(jsConfig, null, "  "));

        if (jsConfigFileLog) {
          logger.info(`-> ${jsConfigPath}`);
        }
      } catch (e) {
        if (e.code !== "ENOENT") {
          throw e;
        }
      }
    }

    return importMap;
  };

  const promise = start();
  if (!throwUnhandled) return promise;
  return promise.catch(e => {
    setTimeout(() => {
      throw e;
    });
  });
});

exports.generateImportMapForPackage = generateImportMapForPackage;
exports.generateImportMapForProjectPackage = generateImportMapForProjectPackage;
//# sourceMappingURL=main.js.map
