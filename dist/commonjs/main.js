'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var url$1 = require('url');
var fs = require('fs');
require('crypto');
var util = require('util');

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

const isFileSystemPath = value => {
  if (typeof value !== "string") {
    throw new TypeError(`isFileSystemPath first arg must be a string, got ${value}`);
  }

  if (value[0] === "/") return true;
  return startsWithWindowsDriveLetter(value);
};

const startsWithWindowsDriveLetter = string => {
  const firstChar = string[0];
  if (!/[a-zA-Z]/.test(firstChar)) return false;
  const secondChar = string[1];
  if (secondChar !== ":") return false;
  return true;
};

const fileSystemPathToUrl = value => {
  if (!isFileSystemPath(value)) {
    throw new Error(`received an invalid value for fileSystemPath: ${value}`);
  }

  return String(url$1.pathToFileURL(value));
};

const ensureUrlTrailingSlash = url => {
  return url.endsWith("/") ? url : `${url}/`;
};

const assertAndNormalizeDirectoryUrl = value => {
  let urlString;

  if (value instanceof URL) {
    urlString = value.href;
  } else if (typeof value === "string") {
    if (isFileSystemPath(value)) {
      urlString = fileSystemPathToUrl(value);
    } else {
      try {
        urlString = String(new URL(value));
      } catch (e) {
        throw new TypeError(`directoryUrl must be a valid url, received ${value}`);
      }
    }
  } else {
    throw new TypeError(`directoryUrl must be a string or an url, received ${value}`);
  }

  if (!urlString.startsWith("file://")) {
    throw new Error(`directoryUrl must starts with file://, received ${value}`);
  }

  return ensureUrlTrailingSlash(urlString);
};

const assertAndNormalizeFileUrl = value => {
  let urlString;

  if (value instanceof URL) {
    urlString = value.href;
  } else if (typeof value === "string") {
    if (isFileSystemPath(value)) {
      urlString = fileSystemPathToUrl(value);
    } else {
      try {
        urlString = String(new URL(value));
      } catch (e) {
        throw new TypeError(`fileUrl must be a valid url, received ${value}`);
      }
    }
  } else {
    throw new TypeError(`fileUrl must be a string or an url, received ${value}`);
  }

  if (!urlString.startsWith("file://")) {
    throw new Error(`fileUrl must starts with file://, received ${value}`);
  }

  return urlString;
};

const urlToFileSystemPath = fileUrl => {
  return url$1.fileURLToPath(fileUrl);
};

// eslint-disable-next-line import/no-unresolved
const nodeRequire = require;
const filenameContainsBackSlashes = __filename.indexOf("\\") > -1;
const url = filenameContainsBackSlashes ? `file:///${__filename.replace(/\\/g, "/")}` : `file://${__filename}`;

const rimraf = nodeRequire("rimraf");

const createFileDirectories = value => {
  const fileUrl = assertAndNormalizeFileUrl(value);
  const filePath = urlToFileSystemPath(fileUrl);
  return new Promise((resolve, reject) => {
    fs.mkdir(path.dirname(filePath), {
      recursive: true
    }, error => {
      if (error) {
        if (error.code === "EEXIST") {
          resolve();
          return;
        }

        reject(error);
        return;
      }

      resolve();
    });
  });
};

const directoryExists = async value => {
  const directoryUrl = assertAndNormalizeDirectoryUrl(value);
  const directoryPath = urlToFileSystemPath(directoryUrl);
  return new Promise((resolve, reject) => {
    fs.stat(directoryPath, (error, stats) => {
      if (error) {
        if (error.code === "ENOENT") resolve(false);else reject(error);
      } else {
        resolve(stats.isDirectory());
      }
    });
  });
};

// the error.code === 'ENOENT' shortcut that avoids
// throwing any error

const fileExists = async value => {
  const fileUrl = assertAndNormalizeFileUrl(value);
  const filePath = urlToFileSystemPath(fileUrl);
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (error, stats) => {
      if (error) {
        if (error.code === "ENOENT") resolve(false);else reject(error);
      } else {
        resolve(stats.isFile());
      }
    });
  });
};

const readFilePromisified = util.promisify(fs.readFile);
const readFileContent = async value => {
  const fileUrl = assertAndNormalizeFileUrl(value);
  const filePath = urlToFileSystemPath(fileUrl);
  const buffer = await readFilePromisified(filePath);
  return buffer.toString();
};

const statPromisified = util.promisify(fs.stat);

const resolveUrl = (specifier, baseUrl) => {
  if (typeof baseUrl === "undefined") {
    throw new TypeError(`baseUrl missing`);
  }

  return String(new URL(specifier, baseUrl));
};

const getCommonPathname = (pathname, otherPathname) => {
  const firstDifferentCharacterIndex = findFirstDifferentCharacterIndex(pathname, otherPathname); // pathname and otherpathname are exactly the same

  if (firstDifferentCharacterIndex === -1) {
    return pathname;
  }

  const commonString = pathname.slice(0, firstDifferentCharacterIndex + 1); // the first different char is at firstDifferentCharacterIndex

  if (pathname.charAt(firstDifferentCharacterIndex) === "/") {
    return commonString;
  }

  if (otherPathname.charAt(firstDifferentCharacterIndex) === "/") {
    return commonString;
  }

  const firstDifferentSlashIndex = commonString.lastIndexOf("/");
  return pathname.slice(0, firstDifferentSlashIndex + 1);
};

const findFirstDifferentCharacterIndex = (string, otherString) => {
  const maxCommonLength = Math.min(string.length, otherString.length);
  let i = 0;

  while (i < maxCommonLength) {
    const char = string.charAt(i);
    const otherChar = otherString.charAt(i);

    if (char !== otherChar) {
      return i;
    }

    i++;
  }

  if (string.length === otherString.length) {
    return -1;
  } // they differ at maxCommonLength


  return maxCommonLength;
};

const pathnameToDirectoryPathname = pathname => {
  if (pathname.endsWith("/")) {
    return pathname;
  }

  const slashLastIndex = pathname.lastIndexOf("/");

  if (slashLastIndex === -1) {
    return "";
  }

  return pathname.slice(0, slashLastIndex + 1);
};

const urlToRelativeUrl = (urlArg, baseUrlArg) => {
  const url = new URL(urlArg);
  const baseUrl = new URL(baseUrlArg);

  if (url.protocol !== baseUrl.protocol) {
    return urlArg;
  }

  if (url.username !== baseUrl.username || url.password !== baseUrl.password) {
    return urlArg.slice(url.protocol.length);
  }

  if (url.host !== baseUrl.host) {
    return urlArg.slice(url.protocol.length);
  }

  const {
    pathname,
    hash,
    search
  } = url;

  if (pathname === "/") {
    return baseUrl.pathname.slice(1);
  }

  const {
    pathname: basePathname
  } = baseUrl;
  const commonPathname = getCommonPathname(pathname, basePathname);

  if (!commonPathname) {
    return urlArg;
  }

  const specificPathname = pathname.slice(commonPathname.length);
  const baseSpecificPathname = basePathname.slice(commonPathname.length);
  const baseSpecificDirectoryPathname = pathnameToDirectoryPathname(baseSpecificPathname);
  const relativeDirectoriesNotation = baseSpecificDirectoryPathname.replace(/.*?\//g, "../");
  const relativePathname = `${relativeDirectoriesNotation}${specificPathname}`;
  return `${relativePathname}${search}${hash}`;
};

const writeFilePromisified = util.promisify(fs.writeFile);
const writeFileContent = async (value, content) => {
  const fileUrl = assertAndNormalizeFileUrl(value);
  const filePath = urlToFileSystemPath(fileUrl);
  await createFileDirectories(filePath);
  return writeFilePromisified(filePath, content);
};

const readPackageFile = async (packageFileUrl, manualOverrides) => {
  const packageFileString = await readFileContent(packageFileUrl);
  const packageJsonObject = JSON.parse(packageFileString);
  const {
    name,
    version
  } = packageJsonObject;
  const overrideKey = Object.keys(manualOverrides).find(overrideKeyCandidate => {
    if (name === overrideKeyCandidate) return true;
    if (`${name}@${version}` === overrideKeyCandidate) return true;
    return false;
  });

  if (overrideKey) {
    return composeObject(packageJsonObject, manualOverrides[overrideKey]);
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

const createCancelError = reason => {
  const cancelError = new Error(`canceled because ${reason}`);
  cancelError.name = "CANCEL_ERROR";
  cancelError.reason = reason;
  return cancelError;
};
const isCancelError = value => {
  return value && typeof value === "object" && value.name === "CANCEL_ERROR";
};

const arrayWithout = (array, item) => {
  const arrayWithoutItem = [];
  let i = 0;

  while (i < array.length) {
    const value = array[i];
    i++;

    if (value === item) {
      continue;
    }

    arrayWithoutItem.push(value);
  }

  return arrayWithoutItem;
};

// https://github.com/tc39/proposal-cancellation/tree/master/stage0
const createCancellationSource = () => {
  let requested = false;
  let cancelError;
  let registrationArray = [];

  const cancel = reason => {
    if (requested) return;
    requested = true;
    cancelError = createCancelError(reason);
    const registrationArrayCopy = registrationArray.slice();
    registrationArray.length = 0;
    registrationArrayCopy.forEach(registration => {
      registration.callback(cancelError); // const removedDuringCall = registrationArray.indexOf(registration) === -1
    });
  };

  const register = callback => {
    if (typeof callback !== "function") {
      throw new Error(`callback must be a function, got ${callback}`);
    }

    const existingRegistration = registrationArray.find(registration => {
      return registration.callback === callback;
    }); // don't register twice

    if (existingRegistration) {
      return existingRegistration;
    }

    const registration = {
      callback,
      unregister: () => {
        registrationArray = arrayWithout(registrationArray, registration);
      }
    };
    registrationArray = [registration, ...registrationArray];
    return registration;
  };

  const throwIfRequested = () => {
    if (requested) {
      throw cancelError;
    }
  };

  return {
    token: {
      register,

      get cancellationRequested() {
        return requested;
      },

      throwIfRequested
    },
    cancel
  };
};

const catchAsyncFunctionCancellation = asyncFunction => {
  return asyncFunction().catch(error => {
    if (isCancelError(error)) return;
    throw error;
  });
};

const createCancellationTokenForProcessSIGINT = () => {
  const SIGINTCancelSource = createCancellationSource();
  process.on("SIGINT", () => SIGINTCancelSource.cancel("process interruption"));
  return SIGINTCancelSource.token;
};

const resolveNodeModule = async ({
  logger,
  rootProjectDirectoryUrl,
  manualOverrides,
  packageFileUrl,
  packageJsonObject,
  dependencyName,
  dependencyVersionPattern,
  dependencyType
}) => {
  const packageDirectoryUrl = resolveUrl("./", packageFileUrl);
  const nodeModuleCandidateArray = [...computeNodeModuleCandidateArray(packageDirectoryUrl, rootProjectDirectoryUrl), `node_modules/`];
  const result = await firstOperationMatching({
    array: nodeModuleCandidateArray,
    start: async nodeModuleCandidate => {
      const packageFileUrl = `${rootProjectDirectoryUrl}${nodeModuleCandidate}${dependencyName}/package.json`;

      try {
        const packageJsonObject = await readPackageFile(packageFileUrl, manualOverrides);
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
${urlToFileSystemPath(packageFileUrl)}
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
${urlToFileSystemPath(packageFileUrl)}
    `);
  }

  return result;
};

const computeNodeModuleCandidateArray = (packageDirectoryUrl, rootProjectDirectoryUrl) => {
  if (packageDirectoryUrl === rootProjectDirectoryUrl) {
    return [];
  }

  const packageDirectoryRelativeUrl = urlToRelativeUrl(packageDirectoryUrl, rootProjectDirectoryUrl);
  const candidateArray = [];
  const relativeNodeModuleDirectoryArray = `./${packageDirectoryRelativeUrl}`.split("/node_modules/"); // remove the first empty string

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

  const packageFilePath = urlToFileSystemPath(packageFileUrl);
  const packageDirectoryUrl = resolveUrl("./", packageFileUrl);
  const mainFileRelativeUrl = packageMainFieldValue.endsWith("/") ? `${packageMainFieldValue}index` : packageMainFieldValue;
  const mainFileUrlFirstCandidate = resolveUrl(mainFileRelativeUrl, packageFileUrl);

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
${url$1.fileURLToPath(mainFileUrlFirstCandidate)}
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
  if (await fileExists(mainFileUrl)) {
    return mainFileUrl;
  }

  if (await directoryExists(mainFileUrl)) {
    const indexFileUrl = resolveUrl("./index", mainFileUrl.endsWith("/") ? mainFileUrl : `${mainFileUrl}/`);
    const extensionLeadingToAFile = await findExtension(indexFileUrl);

    if (extensionLeadingToAFile === null) {
      return null;
    }

    return `${indexFileUrl}.${extensionLeadingToAFile}`;
  }

  const mainFilePath = urlToFileSystemPath(mainFileUrl);
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
  const filePath = urlToFileSystemPath(fileUrl);
  const fileDirname = path.dirname(filePath);
  const fileBasename = path.basename(filePath);
  const extensionLeadingToFile = await firstOperationMatching({
    array: extensionCandidateArray,
    start: async extensionCandidate => {
      const filePathCandidate = `${fileDirname}/${fileBasename}.${extensionCandidate}`;
      const exists = await fileExists(filePathCandidate);
      return exists ? extensionCandidate : null;
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
  const packageFilePath = urlToFileSystemPath(packageFileUrl);
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
  favoredExports
}) => {
  const importsForPackageExports = {};
  const packageFilePath = urlToFileSystemPath(packageFileUrl);
  const {
    exports: packageExports
  } = packageJsonObject; // false is allowed as laternative to exports: {}

  if (packageExports === false) return importsForPackageExports; // exports used to indicate the main file

  if (typeof packageExports === "string") {
    const from = packageName;
    const to = packageExports;
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
      const favoredExport = favoredExports.find(key => key in value);

      if (favoredExport) {
        address = value[favoredExport];
      } else if ("default" in value) {
        address = value.default;
      } else {
        return;
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

    let to;

    if (address[0] === "/") {
      to = address;
    } else if (address.startsWith("./")) {
      to = `./${packageDirectoryRelativeUrl}${address.slice(2)}`;
    } else {
      to = `./${packageDirectoryRelativeUrl}${address}`;
    }

    importsForPackageExports[from] = to;
  });
  return importsForPackageExports;
};

/* eslint-disable import/max-dependencies */
const generateImportMapForPackage = async ({
  logger,
  projectDirectoryUrl,
  rootProjectDirectoryUrl,
  manualOverrides = {},
  includeDevDependencies = false,
  includeExports = true,
  // pass ['browser', 'default'] to read browser first then 'default' if defined
  // in package exports field
  favoredExports = [],
  includeImports = true,
  selfImport = true
}) => {
  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl);

  if (typeof rootProjectDirectoryUrl === "undefined") {
    rootProjectDirectoryUrl = projectDirectoryUrl;
  } else {
    rootProjectDirectoryUrl = assertAndNormalizeDirectoryUrl(rootProjectDirectoryUrl);
  }

  const projectPackageFileUrl = resolveUrl("./package.json", projectDirectoryUrl);
  const rootProjectPackageFileUrl = resolveUrl("./package.json", rootProjectDirectoryUrl);
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
        packageDirectoryRelativeUrl
      } = packageInfo;
      Object.keys(importsForPackageImports).forEach(from => {
        const to = importsForPackageImports[from];

        if (packageIsRoot) {
          addImportMapping({
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

    if (selfImport) {
      const {
        importerIsRoot,
        packageDirectoryRelativeUrl
      } = packageInfo;

      if (importerIsRoot) {
        addImportMapping({
          from: `${packageName}/`,
          to: `./${packageDirectoryRelativeUrl}`
        });
      } else {
        addScopedImportMapping({
          scope: `./${packageDirectoryRelativeUrl}`,
          from: `${packageName}/`,
          to: `./${packageDirectoryRelativeUrl}`
        });
      }
    }

    if (includeExports && "exports" in packageJsonObject) {
      const importsForPackageExports = visitPackageExports({
        packageFileUrl,
        packageName,
        packageJsonObject,
        packageInfo,
        favoredExports
      });
      const {
        importerIsRoot,
        importerRelativeUrl,
        packageIsRoot,
        packageDirectoryUrl,
        packageDirectoryUrlExpected
      } = packageInfo;

      if (packageIsRoot && selfImport) {
        Object.keys(importsForPackageExports).forEach(from => {
          const to = importsForPackageExports[from];
          addImportMapping({
            from,
            to
          });
        });
      } else if (packageIsRoot) ; else {
        Object.keys(importsForPackageExports).forEach(from => {
          const to = importsForPackageExports[from];

          if (importerIsRoot) {
            addImportMapping({
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
    const mainFileRelativeUrl = urlToRelativeUrl(mainFileUrl, rootProjectDirectoryUrl);
    const from = packageName;
    const to = `./${mainFileRelativeUrl}`;

    if (importerIsRoot) {
      addImportMapping({
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
    const importerPackageDirectoryUrl = resolveUrl("./", importerPackageFileUrl);
    const importerRelativeUrl = importerIsRoot ? `${path.basename(rootProjectDirectoryUrl)}/` : urlToRelativeUrl(importerPackageDirectoryUrl, rootProjectDirectoryUrl);
    const packageIsRoot = packageFileUrl === rootProjectPackageFileUrl;
    const packageIsProject = packageFileUrl === projectPackageFileUrl;
    const packageDirectoryUrl = resolveUrl("./", packageFileUrl);
    let packageDirectoryUrlExpected;

    if (packageIsProject && !packageIsRoot) {
      packageDirectoryUrlExpected = importerPackageDirectoryUrl;
    } else {
      packageDirectoryUrlExpected = `${importerPackageDirectoryUrl}node_modules/${packageName}/`;
    }

    const packageDirectoryRelativeUrl = urlToRelativeUrl(packageDirectoryUrl, rootProjectDirectoryUrl);
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
      manualOverrides,
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

  const projectPackageJsonObject = await readPackageFile(projectPackageFileUrl, manualOverrides);
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
      includeDevDependencies
    });
  } else {
    logger.warn(`package name field must be a string
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

  throw new Error(`unexpected logLevel.
--- logLevel ---
${logLevel}
--- allowed log levels ---
${LOG_LEVEL_OFF}
${LOG_LEVEL_ERROR}
${LOG_LEVEL_WARN}
${LOG_LEVEL_INFO}
${LOG_LEVEL_DEBUG}`);
};
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
  // nothing is actually listening for this cancellationToken for now
  // it's not very important but it would be better to register on it
  // an stops what we are doing if asked to do so
  cancellationToken = createCancellationTokenForProcessSIGINT(),
  logLevel,
  projectDirectoryUrl,
  manualOverrides,
  includeDevDependencies = process.env.NODE_ENV !== "production",
  includeExports = true,
  favoredExports = [],
  includeImports = true,
  importMapFile = false,
  importMapFileRelativeUrl = "./importMap.json",
  importMapFileLog = true,
  jsConfigFile = false,
  jsConfigFileLog = true,
  jsConfigLeadingSlash = false
}) => catchAsyncFunctionCancellation(async () => {
  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl);
  const logger = createLogger({
    logLevel
  });
  const importMap = await generateImportMapForPackage({
    cancellationToken,
    logger,
    projectDirectoryUrl,
    manualOverrides,
    includeDevDependencies,
    includeExports,
    includeImports,
    favoredExports
  });

  if (importMapFile) {
    const importMapFileUrl = resolveUrl(importMapFileRelativeUrl, projectDirectoryUrl);
    const importMapFilePath = urlToFileSystemPath(importMapFileUrl);
    await writeFileContent(importMapFilePath, JSON.stringify(importMap, null, "  "));

    if (importMapFileLog) {
      logger.info(`-> ${importMapFilePath}`);
    }
  }

  if (jsConfigFile) {
    const jsConfigFileUrl = resolveUrl("./jsconfig.json", projectDirectoryUrl);
    const jsConfigFilePath = urlToFileSystemPath(jsConfigFileUrl);

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

exports.generateImportMapForPackage = generateImportMapForPackage;
exports.generateImportMapForProjectPackage = generateImportMapForProjectPackage;
//# sourceMappingURL=main.js.map
