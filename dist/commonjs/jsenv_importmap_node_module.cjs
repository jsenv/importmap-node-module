'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var logger = require('@jsenv/logger');
var filesystem = require('@jsenv/filesystem');
var importmap = require('@jsenv/importmap');
var cancellation = require('@jsenv/cancellation');
var isSpecifierForNodeCoreModule_js = require('@jsenv/importmap/src/isSpecifierForNodeCoreModule.js');
var module$1 = require('module');

const createPackageNameMustBeAStringWarning = ({
  packageName,
  packageInfo
}) => {
  return {
    code: "PACKAGE_NAME_MUST_BE_A_STRING",
    message: `package name field must be a string
--- package name field ---
${packageName}
--- package.json path ---
${filesystem.urlToFileSystemPath(packageInfo.url)}`
  };
};
const createImportResolutionFailedWarning = ({
  specifier,
  importedBy,
  gotBareSpecifierError,
  magicExtension,
  suggestsNodeRuntime,
  automapping
}) => {
  return {
    code: "IMPORT_RESOLUTION_FAILED",
    message: logger.createDetailedMessage(`Import resolution failed for "${specifier}"`, {
      "import source": importedBy,
      "reason": gotBareSpecifierError ? `there is no mapping for this bare specifier` : `file not found on filesystem`,
      ...getImportResolutionFailedSuggestions({
        suggestsNodeRuntime,
        gotBareSpecifierError,
        magicExtension,
        automapping
      }) // "extensions tried": magicExtensions.join(`, `),

    })
  };
};
const createBareSpecifierAutomappingMessage = ({
  specifier,
  importedBy,
  automapping
}) => {
  return logger.createDetailedMessage(`Auto mapping for "${specifier}"`, {
    "import source": importedBy,
    "mapping": mappingToImportmapString(automapping),
    "reason": `bare specifier and "bareSpecifierAutomapping" enabled`
  });
};
const createExtensionLessAutomappingMessage = ({
  specifier,
  importedBy,
  automapping,
  mappingFoundInPackageExports
}) => {
  return logger.createDetailedMessage(`Auto mapping for "${specifier}"`, {
    "import source": importedBy,
    "mapping": mappingToImportmapString(automapping),
    "reason": mappingFoundInPackageExports ? `no file extension and mapping found in package exports` : `no file extension and "bareSpecifierAutomapping" enabled`
  });
};

const getImportResolutionFailedSuggestions = ({
  suggestsNodeRuntime,
  gotBareSpecifierError,
  magicExtension,
  automapping
}) => {
  const suggestions = {};

  const addSuggestion = suggestion => {
    const suggestionCount = Object.keys(suggestions).length;
    suggestions[`suggestion ${suggestionCount + 1}`] = suggestion;
  };

  if (suggestsNodeRuntime) {
    addSuggestion(`use runtime: "node"`);
  }

  if (automapping) {
    addSuggestion(`update import specifier to "${mappingToUrlRelativeToFile(automapping)}"`);

    if (gotBareSpecifierError) {
      addSuggestion(`use bareSpecifierAutomapping: true`);
    }

    if (magicExtension) {
      addSuggestion(`use extensionlessAutomapping: true`);
    }

    addSuggestion(`add mapping to "initialImportMap"
${mappingToImportmapString(automapping)}`);
  }

  return suggestions;
};

const mappingToUrlRelativeToFile = mapping => {
  if (!mapping.scope) {
    return mapping.to;
  }

  const scopeUrl = filesystem.resolveUrl(mapping.scope, "file:///");
  const toUrl = filesystem.resolveUrl(mapping.to, "file:///");
  return `./${filesystem.urlToRelativeUrl(toUrl, scopeUrl)}`;
};

const mappingToImportmapString = ({
  scope,
  from,
  to
}) => {
  if (scope) {
    return JSON.stringify({
      scopes: {
        [scope]: {
          [from]: to
        }
      }
    }, null, "  ");
  }

  return JSON.stringify({
    imports: {
      [from]: to
    }
  }, null, "  ");
}; // const mappingToExportsFieldString = ({ scope, from, to }) => {
//   if (scope) {
//     const scopeUrl = resolveUrl(scope, "file://")
//     const toUrl = resolveUrl(to, "file://")
//     to = `./${urlToRelativeUrl(toUrl, scopeUrl)}`
//   }
//   return JSON.stringify(
//     {
//       exports: {
//         [from]: to,
//       },
//     },
//     null,
//     "  ",
//   )
// }

const resolveFile = async (fileUrl, {
  magicDirectoryIndexEnabled,
  magicExtensionEnabled,
  magicExtensions
}) => {
  const fileStat = await filesystem.readFileSystemNodeStat(fileUrl, {
    nullIfNotFound: true
  }); // file found

  if (fileStat && fileStat.isFile()) {
    return {
      found: true,
      url: fileUrl
    };
  } // directory found


  if (fileStat && fileStat.isDirectory()) {
    if (magicDirectoryIndexEnabled) {
      const indexFileSuffix = fileUrl.endsWith("/") ? "index" : "/index";
      const indexFileUrl = `${fileUrl}${indexFileSuffix}`;
      const result = await resolveFile(indexFileUrl, {
        magicExtensionEnabled,
        magicDirectoryIndexEnabled: false,
        magicExtensions
      });
      return {
        magicDirectoryIndex: true,
        ...result
      };
    }

    return {
      found: false,
      url: fileUrl
    };
  }

  if (!magicExtensionEnabled) {
    return {
      found: false,
      url: fileUrl
    };
  } // file already has an extension, magic extension cannot be used


  const extension = filesystem.urlToExtension(fileUrl);

  if (extension !== "") {
    return {
      found: false,
      url: fileUrl
    };
  }

  const extensionLeadingToAFile = await findExtensionLeadingToFile(fileUrl, magicExtensions); // magic extension not found

  if (extensionLeadingToAFile === null) {
    return {
      found: false,
      url: fileUrl
    };
  } // magic extension worked


  return {
    magicExtension: extensionLeadingToAFile,
    found: true,
    url: `${fileUrl}${extensionLeadingToAFile}`
  };
};

const findExtensionLeadingToFile = async (fileUrl, magicExtensions) => {
  const urlDirectoryUrl = filesystem.resolveUrl("./", fileUrl);
  const urlFilename = filesystem.urlToFilename(fileUrl);
  const extensionLeadingToFile = await cancellation.firstOperationMatching({
    array: magicExtensions,
    start: async extensionCandidate => {
      const urlCandidate = `${urlDirectoryUrl}${urlFilename}${extensionCandidate}`;
      const stats = await filesystem.readFileSystemNodeStat(urlCandidate, {
        nullIfNotFound: true
      });
      return stats && stats.isFile() ? extensionCandidate : null;
    },
    predicate: extension => Boolean(extension)
  });
  return extensionLeadingToFile || null;
};

const resolvePackageMain = ({
  warn,
  packageInfo // nodeResolutionConditions = [],

}) => {
  if ("main" in packageInfo.object) {
    return resolveMainFile({
      warn,
      packageFileUrl: packageInfo.url,
      packageMainFieldName: "main",
      packageMainFieldValue: packageInfo.object.main
    });
  }

  return resolveMainFile({
    warn,
    packageFileUrl: packageInfo.url,
    packageMainFieldName: "default",
    packageMainFieldValue: "index"
  });
};

const resolveMainFile = async ({
  warn,
  packageFileUrl,
  packageMainFieldName,
  packageMainFieldValue
}) => {
  // main is explicitely empty meaning
  // it is assumed that we should not find a file
  if (packageMainFieldValue === "") {
    return null;
  }

  const packageDirectoryUrl = filesystem.resolveUrl("./", packageFileUrl);
  const mainFileRelativeUrl = packageMainFieldValue.endsWith("/") ? `${packageMainFieldValue}index` : packageMainFieldValue;
  const mainFileUrlFirstCandidate = filesystem.resolveUrl(mainFileRelativeUrl, packageFileUrl);

  if (!mainFileUrlFirstCandidate.startsWith(packageDirectoryUrl)) {
    warn(createPackageMainFileMustBeRelativeWarning({
      packageMainFieldName,
      packageMainFieldValue,
      packageFileUrl
    }));
    return null;
  }

  const {
    found,
    url
  } = await resolveFile(mainFileUrlFirstCandidate, {
    magicDirectoryIndexEnabled: true,
    magicExtensionEnabled: true,
    magicExtensions: [".js", ".json", ".node"]
  });

  if (!found) {
    // we know in advance this remapping does not lead to an actual file.
    // we only warn because we have no guarantee this remapping will actually be used
    // in the codebase.
    // warn only if there is actually a main field
    // otherwise the package.json is missing the main field
    // it certainly means it's not important
    if (packageMainFieldName !== "default") {
      warn(createPackageMainFileNotFoundWarning({
        specifier: packageMainFieldValue,
        importedIn: `${packageFileUrl}#${packageMainFieldName}`,
        fileUrl: mainFileUrlFirstCandidate,
        magicExtensions: [".js", ".json", ".node"]
      }));
    }

    return mainFileUrlFirstCandidate;
  }

  return url;
};

const createPackageMainFileMustBeRelativeWarning = ({
  packageMainFieldName,
  packageMainFieldValue,
  packageFileUrl
}) => {
  return {
    code: "PACKAGE_MAIN_FILE_MUST_BE_RELATIVE",
    message: `${packageMainFieldName} field in package.json must be inside package.json folder.
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- package.json path ---
${filesystem.urlToFileSystemPath(packageFileUrl)}`
  };
};

const createPackageMainFileNotFoundWarning = ({
  specifier,
  importedIn,
  fileUrl,
  magicExtensions
}) => {
  return {
    code: "PACKAGE_MAIN_FILE_NOT_FOUND",
    message: logger.createDetailedMessage(`Cannot find package main file "${specifier}"`, {
      "imported in": importedIn,
      "file url tried": fileUrl,
      ...(filesystem.urlToExtension(fileUrl) === "" ? {
        ["extensions tried"]: magicExtensions.join(`, `)
      } : {})
    })
  };
};

const visitPackageImportMap = async ({
  warn,
  packageInfo,
  packageImportmap = packageInfo.object.importmap,
  projectDirectoryUrl
}) => {
  if (typeof packageImportmap === "undefined") {
    return {};
  }

  if (typeof packageImportmap === "string") {
    const importmapFileUrl = importmap.resolveUrl(packageImportmap, packageInfo.url);

    try {
      const importmap$1 = await filesystem.readFile(importmapFileUrl, {
        as: "json"
      });
      return importmap.moveImportMap(importmap$1, importmapFileUrl, projectDirectoryUrl);
    } catch (e) {
      if (e.code === "ENOENT") {
        warn(createPackageImportMapNotFoundWarning({
          importmapFileUrl,
          packageInfo
        }));
        return {};
      }

      throw e;
    }
  }

  if (typeof packageImportmap === "object" && packageImportmap !== null) {
    return packageImportmap;
  }

  warn(createPackageImportMapUnexpectedWarning({
    packageImportmap,
    packageInfo
  }));
  return {};
};

const createPackageImportMapNotFoundWarning = ({
  importmapFileUrl,
  packageInfo
}) => {
  return {
    code: "PACKAGE_IMPORTMAP_NOT_FOUND",
    message: `importmap file specified in a package.json cannot be found,
--- importmap file path ---
${importmapFileUrl}
--- package.json path ---
${filesystem.urlToFileSystemPath(packageInfo.url)}`
  };
};

const createPackageImportMapUnexpectedWarning = ({
  packageImportmap,
  packageInfo
}) => {
  return {
    code: "PACKAGE_IMPORTMAP_UNEXPECTED",
    message: `unexpected value in package.json importmap field: value must be a string or an object.
--- value ---
${packageImportmap}
--- package.json path ---
${filesystem.urlToFileSystemPath(packageInfo.url)}`
  };
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

/*

https://nodejs.org/docs/latest-v15.x/api/packages.html#packages_node_js_package_json_field_definitions

*/
const visitPackageImports = ({
  warn,
  packageInfo,
  packageImports = packageInfo.object.imports,
  packageConditions
}) => {
  const importsSubpaths = {};

  const onImportsSubpath = ({
    key,
    value,
    trace
  }) => {
    if (!specifierIsRelative(value)) {
      warn(createSubpathValueMustBeRelativeWarning$1({
        value,
        valueTrace: trace,
        packageInfo
      }));
      return;
    }

    const keyNormalized = key;
    const valueNormalized = value;
    importsSubpaths[keyNormalized] = valueNormalized;
  };

  const visitSubpathValue = (subpathValue, subpathValueTrace) => {
    if (typeof subpathValue === "string") {
      return handleString(subpathValue, subpathValueTrace);
    }

    if (typeof subpathValue === "object" && subpathValue !== null) {
      return handleObject(subpathValue, subpathValueTrace);
    }

    return handleRemaining(subpathValue, subpathValueTrace);
  };

  const handleString = (subpathValue, subpathValueTrace) => {
    const firstBareKey = subpathValueTrace.slice().reverse().find(key => key.startsWith("#"));
    onImportsSubpath({
      key: firstBareKey,
      value: subpathValue,
      trace: subpathValueTrace
    });
    return true;
  };

  const handleObject = (subpathValue, subpathValueTrace) => {
    // From Node.js documentation:
    // "If a nested conditional does not have any mapping it will continue
    // checking the remaining conditions of the parent condition"
    // https://nodejs.org/docs/latest-v14.x/api/packages.html#packages_nested_conditions
    //
    // So it seems what we do here is not sufficient
    // -> if the condition finally does not lead to something
    // it should be ignored and an other branch be taken until
    // something resolves
    const followConditionBranch = (subpathValue, conditionTrace) => {
      const bareKeys = [];
      const conditionalKeys = [];
      Object.keys(subpathValue).forEach(availableKey => {
        if (availableKey.startsWith("#")) {
          bareKeys.push(availableKey);
        } else {
          conditionalKeys.push(availableKey);
        }
      });

      if (bareKeys.length > 0 && conditionalKeys.length > 0) {
        warn(createSubpathKeysAreMixedWarning$1({
          subpathValue,
          subpathValueTrace: [...subpathValueTrace, ...conditionTrace],
          packageInfo,
          bareKeys,
          conditionalKeys
        }));
        return false;
      } // there is no condition, visit all bare keys (starting with #)


      if (conditionalKeys.length === 0) {
        let leadsToSomething = false;
        bareKeys.forEach(key => {
          leadsToSomething = visitSubpathValue(subpathValue[key], [...subpathValueTrace, ...conditionTrace, key]);
        });
        return leadsToSomething;
      } // there is a condition, keep the first one leading to something


      return conditionalKeys.some(keyCandidate => {
        if (!packageConditions.includes(keyCandidate)) {
          return false;
        }

        const valueCandidate = subpathValue[keyCandidate];
        return visitSubpathValue(valueCandidate, [...subpathValueTrace, ...conditionTrace, keyCandidate]);
      });
    };

    return followConditionBranch(subpathValue, []);
  };

  const handleRemaining = (subpathValue, subpathValueTrace) => {
    warn(createSubpathIsUnexpectedWarning$1({
      subpathValue,
      subpathValueTrace,
      packageInfo
    }));
    return false;
  };

  visitSubpathValue(packageImports, ["imports"]);
  return importsSubpaths;
};

const createSubpathIsUnexpectedWarning$1 = ({
  subpathValue,
  subpathValueTrace,
  packageInfo
}) => {
  return {
    code: "IMPORTS_SUBPATH_UNEXPECTED",
    message: `unexpected subpath in package.json imports: value must be an object or a string.
--- value ---
${subpathValue}
--- value at ---
${subpathValueTrace.join(".")}
--- package.json path ---
${filesystem.urlToFileSystemPath(packageInfo.url)}`
  };
};

const createSubpathKeysAreMixedWarning$1 = ({
  subpathValue,
  subpathValueTrace,
  packageInfo
}) => {
  return {
    code: "IMPORTS_SUBPATH_MIXED_KEYS",
    message: `unexpected subpath keys in package.json imports: cannot mix bare and conditional keys.
--- value ---
${JSON.stringify(subpathValue, null, "  ")}
--- value at ---
${subpathValueTrace.join(".")}
--- package.json path ---
${filesystem.urlToFileSystemPath(packageInfo.url)}`
  };
};

const createSubpathValueMustBeRelativeWarning$1 = ({
  value,
  valueTrace,
  packageInfo
}) => {
  return {
    code: "IMPORTS_SUBPATH_VALUE_UNEXPECTED",
    message: `unexpected subpath value in package.json imports: value must be relative to package
--- value ---
${value}
--- value at ---
${valueTrace.join(".")}
--- package.json path ---
${filesystem.urlToFileSystemPath(packageInfo.url)}`
  };
};

/*

https://nodejs.org/docs/latest-v15.x/api/packages.html#packages_node_js_package_json_field_definitions

*/
const visitPackageExports = ({
  projectDirectoryUrl,
  warn,
  packageInfo,
  packageExports = packageInfo.object.exports,
  packageName = packageInfo.name,
  packageConditions
}) => {
  const exportsSubpaths = {};
  const packageDirectoryUrl = filesystem.resolveUrl("./", packageInfo.url);
  const packageDirectoryRelativeUrl = filesystem.urlToRelativeUrl(packageDirectoryUrl, projectDirectoryUrl);

  const onExportsSubpath = ({
    key,
    value,
    trace
  }) => {
    if (!specifierIsRelative(value)) {
      warn(createSubpathValueMustBeRelativeWarning({
        value,
        valueTrace: trace,
        packageInfo
      }));
      return;
    }

    const keyNormalized = specifierToSource(key, packageName);
    const valueNormalized = addressToDestination(value, packageDirectoryRelativeUrl);
    exportsSubpaths[keyNormalized] = valueNormalized;
  };

  const visitSubpathValue = (subpathValue, subpathValueTrace) => {
    // false is allowed as alternative to exports: {}
    if (subpathValue === false) {
      return handleFalse();
    }

    if (typeof subpathValue === "string") {
      return handleString(subpathValue, subpathValueTrace);
    }

    if (typeof subpathValue === "object" && subpathValue !== null) {
      return handleObject(subpathValue, subpathValueTrace);
    }

    return handleRemaining(subpathValue, subpathValueTrace);
  };

  const handleFalse = () => {
    // nothing to do
    return true;
  };

  const handleString = (subpathValue, subpathValueTrace) => {
    const firstRelativeKey = subpathValueTrace.slice().reverse().find(key => key.startsWith("."));
    const key = firstRelativeKey || ".";
    onExportsSubpath({
      key,
      value: subpathValue,
      trace: subpathValueTrace
    });
    return true;
  };

  const handleObject = (subpathValue, subpathValueTrace) => {
    // From Node.js documentation:
    // "If a nested conditional does not have any mapping it will continue
    // checking the remaining conditions of the parent condition"
    // https://nodejs.org/docs/latest-v14.x/api/packages.html#packages_nested_conditions
    //
    // So it seems what we do here is not sufficient
    // -> if the condition finally does not lead to something
    // it should be ignored and an other branch be taken until
    // something resolves
    const followConditionBranch = (subpathValue, conditionTrace) => {
      const relativeKeys = [];
      const conditionalKeys = [];
      Object.keys(subpathValue).forEach(availableKey => {
        if (availableKey.startsWith(".")) {
          relativeKeys.push(availableKey);
        } else {
          conditionalKeys.push(availableKey);
        }
      });

      if (relativeKeys.length > 0 && conditionalKeys.length > 0) {
        warn(createSubpathKeysAreMixedWarning({
          subpathValue,
          subpathValueTrace: [...subpathValueTrace, ...conditionTrace],
          packageInfo,
          relativeKeys,
          conditionalKeys
        }));
        return false;
      } // there is no condition, visit all relative keys


      if (conditionalKeys.length === 0) {
        let leadsToSomething = false;
        relativeKeys.forEach(key => {
          leadsToSomething = visitSubpathValue(subpathValue[key], [...subpathValueTrace, ...conditionTrace, key]);
        });
        return leadsToSomething;
      } // there is a condition, keep the first one leading to something


      return conditionalKeys.some(keyCandidate => {
        if (!packageConditions.includes(keyCandidate)) {
          return false;
        }

        const valueCandidate = subpathValue[keyCandidate];
        return visitSubpathValue(valueCandidate, [...subpathValueTrace, ...conditionTrace, keyCandidate]);
      });
    };

    if (Array.isArray(subpathValue)) {
      subpathValue = exportsObjectFromExportsArray(subpathValue);
    }

    return followConditionBranch(subpathValue, []);
  };

  const handleRemaining = (subpathValue, subpathValueTrace) => {
    warn(createSubpathIsUnexpectedWarning({
      subpathValue,
      subpathValueTrace,
      packageInfo
    }));
    return false;
  };

  visitSubpathValue(packageExports, ["exports"]);
  return exportsSubpaths;
};

const exportsObjectFromExportsArray = exportsArray => {
  const exportsObject = {};
  exportsArray.forEach(exportValue => {
    if (typeof exportValue === "object") {
      Object.assign(exportsObject, exportValue);
      return;
    }

    if (typeof exportValue === "string") {
      exportsObject.default = exportValue;
    }
  });
  return exportsObject;
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

const createSubpathIsUnexpectedWarning = ({
  subpathValue,
  subpathValueTrace,
  packageInfo
}) => {
  return {
    code: "EXPORTS_SUBPATH_UNEXPECTED",
    message: `unexpected subpath in package.json exports: value must be an object or a string.
--- value ---
${subpathValue}
--- value at ---
${subpathValueTrace.join(".")}
--- package.json path ---
${filesystem.urlToFileSystemPath(packageInfo)}`
  };
};

const createSubpathKeysAreMixedWarning = ({
  subpathValue,
  subpathValueTrace,
  packageInfo
}) => {
  return {
    code: "EXPORTS_SUBPATH_MIXED_KEYS",
    message: `unexpected subpath keys in package.json exports: cannot mix relative and conditional keys.
--- value ---
${JSON.stringify(subpathValue, null, "  ")}
--- value at ---
${subpathValueTrace.join(".")}
--- package.json path ---
${filesystem.urlToFileSystemPath(packageInfo)}`
  };
};

const createSubpathValueMustBeRelativeWarning = ({
  value,
  valueTrace,
  packageInfo
}) => {
  return {
    code: "EXPORTS_SUBPATH_VALUE_MUST_BE_RELATIVE",
    message: `unexpected subpath value in package.json exports: value must be a relative to the package.
--- value ---
${value}
--- value at ---
${valueTrace.join(".")}
--- package.json path ---
${filesystem.urlToFileSystemPath(packageInfo)}`
  };
};

const memoizeAsyncFunctionByUrl = fn => {
  const cache = {};
  return memoizeAsyncFunction(fn, {
    getMemoryEntryFromArguments: ([url]) => {
      return {
        get: () => {
          return cache[url];
        },
        set: promise => {
          cache[url] = promise;
        },
        delete: () => {
          delete cache[url];
        }
      };
    }
  });
};
const memoizeAsyncFunctionBySpecifierAndImporter = fn => {
  const importerCache = {};
  return memoizeAsyncFunction(fn, {
    getMemoryEntryFromArguments: ([specifier, importer]) => {
      return {
        get: () => {
          const specifierCacheForImporter = importerCache[importer];
          return specifierCacheForImporter ? specifierCacheForImporter[specifier] : null;
        },
        set: promise => {
          const specifierCacheForImporter = importerCache[importer];

          if (specifierCacheForImporter) {
            specifierCacheForImporter[specifier] = promise;
          } else {
            importerCache[importer] = {
              [specifier]: promise
            };
          }
        },
        delete: () => {
          const specifierCacheForImporter = importerCache[importer];

          if (specifierCacheForImporter) {
            delete specifierCacheForImporter[specifier];
          }
        }
      };
    }
  });
};

const memoizeAsyncFunction = (fn, {
  getMemoryEntryFromArguments
}) => {
  const memoized = async (...args) => {
    const memoryEntry = getMemoryEntryFromArguments(args);
    const promiseFromMemory = memoryEntry.get();

    if (promiseFromMemory) {
      return promiseFromMemory;
    }

    const {
      promise,
      resolve,
      reject
    } = createControllablePromise();
    memoryEntry.set(promise);
    let value;
    let error;

    try {
      value = fn(...args);
      error = false;
    } catch (e) {
      value = e;
      error = true;
      memoryEntry.delete();
    }

    if (error) {
      reject(error);
    } else {
      resolve(value);
    }

    return promise;
  };

  memoized.isInMemory = (...args) => {
    return Boolean(getMemoryEntryFromArguments(args).get());
  };

  return memoized;
};

const createControllablePromise = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve,
    reject
  };
};

const PACKAGE_NOT_FOUND = {};
const PACKAGE_WITH_SYNTAX_ERROR = {};
const readPackageFile = async packageFileUrl => {
  try {
    const packageObject = await filesystem.readFile(packageFileUrl, {
      as: "json"
    });
    return packageObject;
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
${filesystem.urlToFileSystemPath(packageFileUrl)}
`;
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

const createFindNodeModulePackage = () => {
  const readPackageFileMemoized = memoizeAsyncFunctionByUrl(packageFileUrl => {
    return readPackageFile(packageFileUrl);
  });
  return ({
    projectDirectoryUrl,
    packagesManualOverrides = {},
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
          packageJsonObject: applyPackageManualOverride(packageObjectCandidate, packagesManualOverrides),
          syntaxError: packageObjectCandidate === PACKAGE_WITH_SYNTAX_ERROR
        };
      },
      predicate: ({
        packageJsonObject
      }) => {
        return packageJsonObject !== PACKAGE_NOT_FOUND;
      }
    });
  };
};

const getNodeModuleCandidates = (fileUrl, projectDirectoryUrl) => {
  const fileDirectoryUrl = filesystem.resolveUrl("./", fileUrl);

  if (fileDirectoryUrl === projectDirectoryUrl) {
    return [`node_modules/`];
  }

  const fileDirectoryRelativeUrl = filesystem.urlToRelativeUrl(fileDirectoryUrl, projectDirectoryUrl);
  const candidates = [];
  const relativeNodeModuleDirectoryArray = fileDirectoryRelativeUrl.split("node_modules/"); // remove the first empty string

  relativeNodeModuleDirectoryArray.shift();
  let i = relativeNodeModuleDirectoryArray.length;

  while (i--) {
    candidates.push(`node_modules/${relativeNodeModuleDirectoryArray.slice(0, i + 1).join("node_modules/")}node_modules/`);
  }

  return [...candidates, "node_modules/"];
};

const visitNodeModuleResolution = async ({
  // nothing is actually listening for this cancellationToken for now
  // it's not very important but it would be better to register on it
  // an stops what we are doing if asked to do so
  // cancellationToken = createCancellationTokenForProcess(),
  logger: logger$1,
  warn,
  projectDirectoryUrl,
  visitors,
  packagesManualOverrides
}) => {
  const projectPackageFileUrl = filesystem.resolveUrl("./package.json", projectDirectoryUrl);
  const findNodeModulePackage = createFindNodeModulePackage();
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
    packageVisitors,
    packageInfo,
    packageImporterInfo
  }) => {
    const packageName = packageInfo.object.name;

    if (typeof packageName !== "string") {
      warn(createPackageNameMustBeAStringWarning({
        packageName,
        packageInfo
      })); // if package is root, we don't go further
      // otherwise package name is deduced from file structure
      // si it's thoerically safe to keep going
      // in practice it should never happen because npm won't let
      // a package without name be published

      if (!packageImporterInfo) {
        return;
      }
    }

    packageVisitors = packageVisitors.filter(visitor => {
      return !visitor.packageIncludedPredicate || visitor.packageIncludedPredicate(packageInfo, packageImporterInfo);
    });

    if (packageVisitors.length === 0) {
      return;
    }

    await visitDependencies({
      packageVisitors,
      packageInfo
    });
    await visitPackage({
      packageVisitors,
      packageInfo,
      packageImporterInfo
    });
  };

  const visitDependencies = async ({
    packageVisitors,
    packageInfo
  }) => {
    const dependencyMap = packageDependenciesFromPackageObject(packageInfo.object);
    await Promise.all(Object.keys(dependencyMap).map(async dependencyName => {
      const dependencyInfo = dependencyMap[dependencyName];

      if (dependencyInfo.type === "devDependency") {
        if (packageInfo.url !== projectPackageFileUrl) {
          return;
        }

        const visitorsForDevDependencies = packageVisitors.filter(visitor => {
          return visitor.mappingsForDevDependencies;
        });

        if (visitorsForDevDependencies.length === 0) {
          return;
        }

        await visitDependency({
          packageVisitors: visitorsForDevDependencies,
          packageInfo,
          dependencyName,
          dependencyInfo
        });
        return;
      }

      await visitDependency({
        packageVisitors,
        packageInfo,
        dependencyName,
        dependencyInfo
      });
    }));
  };

  const visitDependency = async ({
    packageVisitors,
    packageInfo,
    dependencyName,
    dependencyInfo
  }) => {
    const dependencyData = await findDependency({
      packageFileUrl: packageInfo.url,
      dependencyName
    });

    if (!dependencyData) {
      const cannotFindPackageWarning = createCannotFindPackageWarning({
        dependencyName,
        dependencyInfo,
        packageInfo
      });

      if (dependencyInfo.isOptional) {
        logger$1.debug(cannotFindPackageWarning.message);
      } else {
        warn(cannotFindPackageWarning);
      }

      return;
    }

    if (dependencyData.syntaxError) {
      return;
    }

    const {
      packageFileUrl: dependencyPackageFileUrl,
      packageJsonObject: dependencyPackageJsonObject
    } = dependencyData;

    if (packageIsSeen(dependencyPackageFileUrl, packageInfo.url)) {
      return;
    }

    markPackageAsSeen(dependencyPackageFileUrl, packageInfo.url);
    await visit({
      packageVisitors,
      packageInfo: {
        url: dependencyPackageFileUrl,
        name: dependencyName,
        object: dependencyPackageJsonObject
      },
      packageImporterInfo: packageInfo
    });
  };

  const visitPackage = async ({
    packageVisitors,
    packageInfo,
    packageImporterInfo
  }) => {
    const packageDerivedInfo = computePackageDerivedInfo({
      projectDirectoryUrl,
      packageInfo,
      packageImporterInfo
    });

    const addImportMapForPackage = (visitor, importMap) => {
      if (packageDerivedInfo.packageIsRoot) {
        const {
          imports = {},
          scopes = {}
        } = importMap;
        Object.keys(imports).forEach(from => {
          triggerVisitorOnMapping(visitor, {
            from,
            to: imports[from]
          });
        });
        Object.keys(scopes).forEach(scope => {
          const scopeMappings = scopes[scope];
          Object.keys(scopeMappings).forEach(key => {
            triggerVisitorOnMapping(visitor, {
              scope,
              from: key,
              to: scopeMappings[key]
            });
          });
        });
        return;
      }

      const {
        imports = {},
        scopes = {}
      } = importMap;
      const scope = `./${packageDerivedInfo.packageDirectoryRelativeUrl}`;
      Object.keys(imports).forEach(from => {
        const to = imports[from];
        const toMoved = moveMappingValue(to, packageInfo.url, projectDirectoryUrl);
        triggerVisitorOnMapping(visitor, {
          scope,
          from,
          to: toMoved
        });
      });
      Object.keys(scopes).forEach(scope => {
        const scopeMappings = scopes[scope];
        const scopeMoved = moveMappingValue(scope, packageInfo.url, projectDirectoryUrl);
        Object.keys(scopeMappings).forEach(key => {
          const to = scopeMappings[key];
          const toMoved = moveMappingValue(to, packageInfo.url, projectDirectoryUrl);
          triggerVisitorOnMapping(visitor, {
            scope: scopeMoved,
            from: key,
            to: toMoved
          });
        });
      });
    };

    const addMappingsForPackageAndImporter = (visitor, mappings) => {
      if (packageDerivedInfo.packageIsRoot) {
        Object.keys(mappings).forEach(from => {
          const to = mappings[from];
          triggerVisitorOnMapping(visitor, {
            from,
            to
          });
        });
        return;
      }

      if (packageDerivedInfo.importerIsRoot) {
        // own package mappings available to himself
        Object.keys(mappings).forEach(from => {
          const to = mappings[from];
          triggerVisitorOnMapping(visitor, {
            scope: `./${packageDerivedInfo.packageDirectoryRelativeUrl}`,
            from,
            to
          });
          triggerVisitorOnMapping(visitor, {
            from,
            to
          });
        }); // if importer is root no need to make package mappings available to the importer
        // because they are already on top level mappings

        return;
      }

      Object.keys(mappings).forEach(from => {
        const to = mappings[from]; // own package exports available to himself

        triggerVisitorOnMapping(visitor, {
          scope: `./${packageDerivedInfo.packageDirectoryRelativeUrl}`,
          from,
          to
        }); // now make package exports available to the importer
        // here if the importer is himself we could do stuff
        // we should even handle the case earlier to prevent top level remapping

        triggerVisitorOnMapping(visitor, {
          scope: `./${packageDerivedInfo.importerRelativeUrl}`,
          from,
          to
        });
      });
    };

    const importsFromPackageField = await visitPackageImportMap({
      warn,
      packageInfo,
      projectDirectoryUrl
    });
    packageVisitors.forEach(visitor => {
      addImportMapForPackage(visitor, importsFromPackageField);
    });

    if ("imports" in packageInfo.object) {
      packageVisitors.forEach(visitor => {
        const packageImports = visitPackageImports({
          warn,
          packageInfo,
          projectDirectoryUrl,
          packageConditions: visitor.packageConditions
        });
        const mappingsFromPackageImports = {};
        Object.keys(packageImports).forEach(from => {
          const to = packageImports[from];
          mappingsFromPackageImports[from] = to;
        });
        addImportMapForPackage(visitor, {
          imports: mappingsFromPackageImports
        });
      });
    }

    if ("exports" in packageInfo.object) {
      packageVisitors.forEach(visitor => {
        const packageExports = visitPackageExports({
          projectDirectoryUrl,
          warn,
          packageInfo,
          packageConditions: visitor.packageConditions
        });
        const mappingsFromPackageExports = {};
        Object.keys(packageExports).forEach(from => {
          const to = packageExports[from];

          if (from.indexOf("*") === -1) {
            mappingsFromPackageExports[from] = to;
            return;
          }

          if (from.endsWith("/*") && to.endsWith("/*") && // ensure ends with '*' AND there is only one '*' occurence
          to.indexOf("*") === to.length - 1) {
            const fromWithouTrailingStar = from.slice(0, -1);
            const toWithoutTrailingStar = to.slice(0, -1);
            mappingsFromPackageExports[fromWithouTrailingStar] = toWithoutTrailingStar;
            return;
          }

          logger$1.debug(createExportsWildcardIgnoredWarning({
            key: from,
            value: to,
            packageInfo
          }));
        });
        addMappingsForPackageAndImporter(visitor, mappingsFromPackageExports);
      });
    } else {
      // no "exports" field means any file can be imported
      // -> generate a mapping to allow this
      // https://nodejs.org/docs/latest-v15.x/api/packages.html#packages_name
      const packageDirectoryRelativeUrl = filesystem.urlToRelativeUrl(filesystem.resolveUrl("./", packageInfo.url), projectDirectoryUrl);
      packageVisitors.forEach(visitor => {
        addMappingsForPackageAndImporter(visitor, {
          [`${packageInfo.name}/`]: `./${packageDirectoryRelativeUrl}`
        });
      }); // visit "main" only if there is no "exports"
      // https://nodejs.org/docs/latest-v16.x/api/packages.html#packages_main

      await visitPackageMain({
        packageVisitors,
        packageInfo,
        packageDerivedInfo
      });
    }
  };

  const visitPackageMain = async ({
    packageVisitors,
    packageInfo,
    packageDerivedInfo
  }) => {
    const {
      packageIsRoot,
      importerIsRoot,
      importerRelativeUrl,
      packageDirectoryUrl,
      packageDirectoryUrlExpected
    } = packageDerivedInfo;
    await packageVisitors.reduce(async (previous, visitor) => {
      await previous;
      const mainFileUrl = await resolvePackageMain({
        warn,
        packageInfo,
        nodeResolutionConditions: visitor.nodeResolutionConditions
      }); // it's possible to have no main
      // like { main: "" } in package.json
      // or a main that does not lead to an actual file

      if (mainFileUrl === null) {
        return;
      }

      const mainFileRelativeUrl = filesystem.urlToRelativeUrl(mainFileUrl, projectDirectoryUrl);
      const scope = packageIsRoot || importerIsRoot ? null : `./${importerRelativeUrl}`;
      const from = packageInfo.name;
      const to = `./${mainFileRelativeUrl}`;
      triggerVisitorOnMapping(visitor, {
        scope,
        from,
        to
      });

      if (packageDirectoryUrl !== packageDirectoryUrlExpected) {
        triggerVisitorOnMapping(visitor, {
          scope: `./${importerRelativeUrl}`,
          from,
          to
        });
      }
    }, Promise.resolve());
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
      projectDirectoryUrl,
      packageFileUrl,
      dependencyName,
      packagesManualOverrides
    });
    dependenciesCache[packageFileUrl][dependencyName] = dependencyPromise;
    return dependencyPromise;
  };

  let projectPackageObject;

  try {
    projectPackageObject = await filesystem.readFile(projectPackageFileUrl, {
      as: "json"
    });
  } catch (e) {
    if (e.code === "ENOENT") {
      const error = new Error(logger.createDetailedMessage(`Cannot find project package.json file.`, {
        "package.json url": projectPackageFileUrl
      }));
      error.code = "PROJECT_PACKAGE_FILE_NOT_FOUND";
      throw error;
    }

    throw e;
  }

  const importerPackageFileUrl = projectPackageFileUrl;
  markPackageAsSeen(projectPackageFileUrl, importerPackageFileUrl);
  await visit({
    packageInfo: {
      url: projectPackageFileUrl,
      name: projectPackageObject.name,
      object: projectPackageObject
    },
    packageImporterInfo: null,
    packageVisitors: visitors
  });
};

const triggerVisitorOnMapping = (visitor, {
  scope,
  from,
  to
}) => {
  if (scope) {
    // when a package says './' maps to './'
    // we add something to say if we are already inside the package
    // no need to ensure leading slash are scoped to the package
    if (from === "./" && to === scope) {
      triggerVisitorOnMapping(visitor, {
        scope,
        from: scope,
        to: scope
      });
      const packageName = scope.slice(scope.lastIndexOf("node_modules/") + `node_modules/`.length);
      triggerVisitorOnMapping(visitor, {
        scope,
        from: packageName,
        to: scope
      });
    }

    visitor.onMapping({
      scope,
      from,
      to
    });
    return;
  } // we could think it's useless to remap from with to
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

  visitor.onMapping({
    from,
    to
  });
};

const packageDependenciesFromPackageObject = packageObject => {
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
  return packageDependencies;
};

const moveMappingValue = (address, from, to) => {
  const url = filesystem.resolveUrl(address, from);
  const relativeUrl = filesystem.urlToRelativeUrl(url, to);

  if (relativeUrl.startsWith("../")) {
    return relativeUrl;
  }

  if (relativeUrl.startsWith("./")) {
    return relativeUrl;
  }

  if (/^[a-zA-Z]{2,}:/.test(relativeUrl)) {
    // has sheme
    return relativeUrl;
  }

  return `./${relativeUrl}`;
};

const computePackageDerivedInfo = ({
  projectDirectoryUrl,
  packageInfo,
  packageImporterInfo
}) => {
  if (!packageImporterInfo) {
    const packageDirectoryUrl = filesystem.resolveUrl("./", packageInfo.url);
    filesystem.urlToRelativeUrl(packageDirectoryUrl, projectDirectoryUrl);
    return {
      importerIsRoot: false,
      importerRelativeUrl: "",
      packageIsRoot: true,
      packageDirectoryUrl,
      packageDirectoryUrlExpected: packageDirectoryUrl,
      packageDirectoryRelativeUrl: filesystem.urlToRelativeUrl(packageDirectoryUrl, projectDirectoryUrl)
    };
  }

  const projectPackageFileUrl = filesystem.resolveUrl("./package.json", projectDirectoryUrl);
  const importerIsRoot = packageImporterInfo.url === projectPackageFileUrl;
  const importerPackageDirectoryUrl = filesystem.resolveUrl("./", packageImporterInfo.url);
  const importerRelativeUrl = filesystem.urlToRelativeUrl(importerPackageDirectoryUrl, projectDirectoryUrl);
  const packageIsRoot = packageInfo.url === projectPackageFileUrl;
  const packageDirectoryUrl = filesystem.resolveUrl("./", packageInfo.url);
  const packageDirectoryUrlExpected = `${importerPackageDirectoryUrl}node_modules/${packageInfo.name}/`;
  const packageDirectoryRelativeUrl = filesystem.urlToRelativeUrl(packageDirectoryUrl, projectDirectoryUrl);
  return {
    importerIsRoot,
    importerRelativeUrl,
    packageIsRoot,
    packageDirectoryUrl,
    packageDirectoryUrlExpected,
    packageDirectoryRelativeUrl
  };
};

const createExportsWildcardIgnoredWarning = ({
  key,
  value,
  packageInfo
}) => {
  return {
    code: "EXPORTS_WILDCARD",
    message: `Ignoring export using "*" because it is not supported by importmap.
--- key ---
${key}
--- value ---
${value}
--- package.json path ---
${filesystem.urlToFileSystemPath(packageInfo.url)}
--- see also ---
https://github.com/WICG/import-maps/issues/232`
  };
};

const createCannotFindPackageWarning = ({
  dependencyName,
  dependencyInfo,
  packageInfo
}) => {
  const dependencyIsOptional = dependencyInfo.isOptional;
  const dependencyType = dependencyInfo.type;
  const dependencyVersionPattern = dependencyInfo.versionPattern;
  return {
    code: "CANNOT_FIND_PACKAGE",
    message: logger.createDetailedMessage(dependencyIsOptional ? `cannot find an optional ${dependencyType}.` : `cannot find a ${dependencyType}.`, {
      [dependencyType]: `${dependencyName}@${dependencyVersionPattern}`,
      "required by": filesystem.urlToFileSystemPath(packageInfo.url)
    })
  };
};

const optimizeImportMap = ({
  imports,
  scopes
}) => {
  // remove useless duplicates (scoped key+value already defined on imports)
  const scopesOptimized = {};
  Object.keys(scopes).forEach(scope => {
    const scopeMappings = scopes[scope];
    const scopeMappingsOptimized = {};
    Object.keys(scopeMappings).forEach(mappingKey => {
      const topLevelMappingValue = imports[mappingKey];
      const mappingValue = scopeMappings[mappingKey];

      if (!topLevelMappingValue || topLevelMappingValue !== mappingValue) {
        scopeMappingsOptimized[mappingKey] = mappingValue;
      }
    });

    if (Object.keys(scopeMappingsOptimized).length > 0) {
      scopesOptimized[scope] = scopeMappingsOptimized;
    }
  });
  return {
    imports,
    scopes: scopesOptimized
  };
};

/* global __filename */
const filenameContainsBackSlashes = __filename.indexOf("\\") > -1;
const url = filenameContainsBackSlashes ? `file:///${__filename.replace(/\\/g, "/")}` : `file://${__filename}`;

const require$1 = module$1.createRequire(url);

const parser = require$1("@babel/parser");

const traverse = require$1("@babel/traverse");

const parseSpecifiersFromFile = async (fileUrl, {
  fileContent,
  jsFilesParsingOptions
} = {}) => {
  fileContent = fileContent === undefined ? await filesystem.readFile(fileUrl, {
    as: "string"
  }) : fileContent;
  const fileExtension = filesystem.urlToExtension(fileUrl);
  const {
    jsx = [".jsx", ".tsx"].includes(fileExtension),
    typescript = [".ts", ".tsx"].includes(filesystem.urlToExtension(fileUrl)),
    flow = false
  } = jsFilesParsingOptions;
  const ast = parser.parse(fileContent, {
    sourceType: "module",
    sourceFilename: filesystem.urlToFileSystemPath(fileUrl),
    plugins: ["topLevelAwait", "exportDefaultFrom", ...(jsx ? ["jsx"] : []), ...(typescript ? ["typescript"] : []), ...(flow ? ["flow"] : [])],
    ...jsFilesParsingOptions,
    ranges: true
  });
  const specifiers = {};

  const addSpecifier = ({
    path,
    type
  }) => {
    const specifier = path.node.value;
    specifiers[specifier] = {
      line: path.node.loc.start.line,
      column: path.node.loc.start.column,
      type
    };
  };

  traverse.default(ast, {
    // "ImportExpression is replaced with a CallExpression whose callee is an Import node."
    // https://babeljs.io/docs/en/babel-parser#output
    // ImportExpression: (path) => {
    //   if (path.node.arguments[0].type !== "StringLiteral") {
    //     // Non-string argument, probably a variable or expression, e.g.
    //     // import(moduleId)
    //     // import('./' + moduleName)
    //     return
    //   }
    //   addSpecifier(path.get("arguments")[0])
    // },
    CallExpression: path => {
      if (path.node.callee.type !== "Import") {
        // Some other function call, not import();
        return;
      }

      if (path.node.arguments[0].type !== "StringLiteral") {
        // Non-string argument, probably a variable or expression, e.g.
        // import(moduleId)
        // import('./' + moduleName)
        return;
      }

      addSpecifier({
        path: path.get("arguments")[0],
        type: "import-dynamic"
      });
    },
    ExportAllDeclaration: path => {
      addSpecifier({
        path: path.get("source"),
        type: "export-all"
      });
    },
    ExportNamedDeclaration: path => {
      if (!path.node.source) {
        // This export has no "source", so it's probably
        // a local variable or function, e.g.
        // export { varName }
        // export const constName = ...
        // export function funcName() {}
        return;
      }

      addSpecifier({
        path: path.get("source"),
        type: "export-named"
      });
    },
    ImportDeclaration: path => {
      addSpecifier({
        path: path.get("source"),
        type: "import-static"
      });
    }
  });
  return specifiers;
};

// https://github.com/postcss/postcss/blob/fd30d3df5abc0954a0ec642a3cdc644ab2aacf9c/lib/css-syntax-error.js#L43
// https://github.com/postcss/postcss/blob/fd30d3df5abc0954a0ec642a3cdc644ab2aacf9c/lib/terminal-highlight.js#L50
// https://github.com/babel/babel/blob/eea156b2cb8deecfcf82d52aa1b71ba4995c7d68/packages/babel-code-frame/src/index.js#L1
const showSource = ({
  url,
  line,
  column,
  source
}) => {
  let message = "";
  message += typeof url === "undefined" ? "Anonymous" : url;

  if (typeof line !== "number") {
    return message;
  }

  message += `:${line}`;

  if (typeof column === "number") {
    message += `:${column}`;
  }

  if (!source) {
    return message;
  }

  return `${message}
${showSourceLocation(source, {
    line,
    column
  })}`;
};
const red = "\x1b[31m";
const grey = "\x1b[39m";
const ansiResetSequence = "\x1b[0m";

const showSourceLocation = (source, {
  line,
  column,
  numberOfSurroundingLinesToShow = 1,
  lineMaxLength = 120,
  color = false,
  markColor = red,
  asideColor = grey,
  colorMark = string => `${markColor}${string}${ansiResetSequence}`,
  colorAside = string => `${asideColor}${string}${ansiResetSequence}`
}) => {
  const mark = color ? colorMark : string => string;
  const aside = color ? colorAside : string => string;
  const lines = source.split(/\r?\n/);
  let lineRange = {
    start: line - 1,
    end: line
  };
  lineRange = moveLineRangeUp(lineRange, numberOfSurroundingLinesToShow);
  lineRange = moveLineRangeDown(lineRange, numberOfSurroundingLinesToShow);
  lineRange = lineRangeWithinLines(lineRange, lines);
  const linesToShow = lines.slice(lineRange.start, lineRange.end);
  const endLineNumber = lineRange.end;
  const lineNumberMaxWidth = String(endLineNumber).length;
  const columnRange = {};

  if (column === undefined) {
    columnRange.start = 0;
    columnRange.end = lineMaxLength;
  } else if (column > lineMaxLength) {
    columnRange.start = column - Math.floor(lineMaxLength / 2);
    columnRange.end = column + Math.ceil(lineMaxLength / 2);
  } else {
    columnRange.start = 0;
    columnRange.end = lineMaxLength;
  }

  return linesToShow.map((lineSource, index) => {
    const lineNumber = lineRange.start + index + 1;
    const isMainLine = lineNumber === line;
    const lineSourceTruncated = applyColumnRange(columnRange, lineSource);
    const lineNumberWidth = String(lineNumber).length; // ensure if line moves from 7,8,9 to 10 the display is still great

    const lineNumberRightSpacing = " ".repeat(lineNumberMaxWidth - lineNumberWidth);
    const asideSource = `${lineNumber}${lineNumberRightSpacing} |`;
    const lineFormatted = `${aside(asideSource)} ${lineSourceTruncated}`;

    if (isMainLine) {
      if (column === undefined) {
        return `${mark(">")} ${lineFormatted}`;
      }

      const lineSourceUntilColumn = lineSourceTruncated.slice(0, column - columnRange.start);
      const spacing = stringToSpaces(lineSourceUntilColumn);
      const mainLineFormatted = `${mark(">")} ${lineFormatted}
  ${" ".repeat(lineNumberWidth)} ${aside("|")}${spacing}${mark("^")}`;
      return mainLineFormatted;
    }

    return `  ${lineFormatted}`;
  }).join(`
`);
};

const applyColumnRange = ({
  start,
  end
}, line) => {
  if (typeof start !== "number") {
    throw new TypeError(`start must be a number, received ${start}`);
  }

  if (typeof end !== "number") {
    throw new TypeError(`end must be a number, received ${end}`);
  }

  if (end < start) {
    throw new Error(`end must be greater than start, but ${end} is smaller than ${start}`);
  }

  const prefix = "…";
  const suffix = "…";
  const lastIndex = line.length;

  if (line.length === 0) {
    // don't show any ellipsis if the line is empty
    // because it's not truncated in that case
    return "";
  }

  const startTruncated = start > 0;
  const endTruncated = lastIndex > end;
  let from = startTruncated ? start + prefix.length : start;
  let to = endTruncated ? end - suffix.length : end;
  if (to > lastIndex) to = lastIndex;

  if (start >= lastIndex || from === to) {
    return "";
  }

  let result = "";

  while (from < to) {
    result += line[from];
    from++;
  }

  if (result.length === 0) {
    return "";
  }

  if (startTruncated && endTruncated) {
    return `${prefix}${result}${suffix}`;
  }

  if (startTruncated) {
    return `${prefix}${result}`;
  }

  if (endTruncated) {
    return `${result}${suffix}`;
  }

  return result;
};

const stringToSpaces = string => string.replace(/[^\t]/g, " "); // const getLineRangeLength = ({ start, end }) => end - start


const moveLineRangeUp = ({
  start,
  end
}, number) => {
  return {
    start: start - number,
    end
  };
};

const moveLineRangeDown = ({
  start,
  end
}, number) => {
  return {
    start,
    end: end + number
  };
};

const lineRangeWithinLines = ({
  start,
  end
}, lines) => {
  return {
    start: start < 0 ? 0 : start,
    end: end > lines.length ? lines.length : end
  };
};

const BARE_SPECIFIER_ERROR = {};
const visitSourceFiles = async ({
  logger,
  warn,
  projectDirectoryUrl,
  jsFilesParsingOptions = {},
  runtime,
  importMap,
  bareSpecifierAutomapping,
  extensionlessAutomapping,
  magicExtensions,
  //  = [".js", ".jsx", ".ts", ".tsx", ".node", ".json"],
  removeUnusedMappings
}) => {
  const projectPackageFileUrl = filesystem.resolveUrl("./package.json", projectDirectoryUrl);
  const imports = {};
  const scopes = {};

  const addMapping = ({
    scope,
    from,
    to
  }) => {
    if (scope) {
      scopes[scope] = { ...(scopes[scope] || {}),
        [from]: to
      };
    } else {
      imports[from] = to;
    }
  };

  const topLevelMappingsUsed = [];
  const scopedMappingsUsed = {};

  const markMappingAsUsed = ({
    scope,
    from,
    to
  }) => {
    if (scope) {
      if (scope in scopedMappingsUsed) {
        scopedMappingsUsed[scope].push({
          from,
          to
        });
      } else {
        scopedMappingsUsed[scope] = [{
          from,
          to
        }];
      }
    } else {
      topLevelMappingsUsed.push({
        from,
        to
      });
    }
  };

  const importMapNormalized = importmap.normalizeImportMap(importMap, projectDirectoryUrl);

  const trackAndResolveImport = (specifier, importer) => {
    return importmap.resolveImport({
      specifier,
      importer,
      importMap: importMapNormalized,
      defaultExtension: false,
      onImportMapping: ({
        scope,
        from
      }) => {
        if (scope) {
          // make scope relative again
          scope = `./${filesystem.urlToRelativeUrl(scope, projectDirectoryUrl)}`; // make from relative again

          if (from.startsWith(projectDirectoryUrl)) {
            from = `./${filesystem.urlToRelativeUrl(from, projectDirectoryUrl)}`;
          }
        }

        markMappingAsUsed({
          scope,
          from,
          to: scope ? importMap.scopes[scope][from] : importMap.imports[from]
        });
      },
      createBareSpecifierError: () => BARE_SPECIFIER_ERROR
    });
  };

  const testImportResolution = memoizeAsyncFunctionBySpecifierAndImporter(async (specifier, importer, {
    importedBy
  }) => {
    const url = await tryToResolveImport({
      logger,
      warn,
      specifier,
      importer,
      importedBy,
      projectDirectoryUrl,
      projectPackageFileUrl,
      trackAndResolveImport,
      runtime,
      bareSpecifierAutomapping,
      extensionlessAutomapping,
      magicExtensions,
      performAutomapping: automapping => {
        addMapping(automapping);
        markMappingAsUsed(automapping);
      }
    });
    return url;
  });
  const visitFile = memoizeAsyncFunctionByUrl(async fileUrl => {
    const fileContent = await filesystem.readFile(fileUrl, {
      as: "string"
    });
    const specifiers = await parseSpecifiersFromFile(fileUrl, {
      fileContent,
      jsFilesParsingOptions
    });
    const dependencies = await Promise.all(Object.keys(specifiers).map(async specifier => {
      const specifierInfo = specifiers[specifier];
      const dependencyUrlOnFileSystem = await testImportResolution(specifier, fileUrl, {
        importedBy: showSource({
          url: fileUrl,
          line: specifierInfo.line,
          column: specifierInfo.column,
          source: fileContent
        })
      });
      return dependencyUrlOnFileSystem;
    }));
    const dependenciesToVisit = dependencies.filter(dependency => {
      return dependency && !visitFile.isInMemory(dependency);
    });
    await Promise.all(dependenciesToVisit.map(dependency => {
      return visitFile(dependency);
    }));
  });
  const projectPackageObject = await filesystem.readFile(projectPackageFileUrl, {
    as: "json"
  });
  const projectPackageName = projectPackageObject.name;

  if (typeof projectPackageName !== "string") {
    warn(createPackageNameMustBeAStringWarning({
      packageName: projectPackageName,
      packageFileUrl: projectPackageFileUrl
    }));
    return importMap;
  }

  const projectMainFileUrlOnFileSystem = await testImportResolution(projectPackageName, projectPackageFileUrl, {
    importedBy: projectPackageObject.exports ? `${projectPackageFileUrl}#exports` : `${projectPackageFileUrl}`
  });

  if (projectMainFileUrlOnFileSystem) {
    await visitFile(projectMainFileUrlOnFileSystem);
  }

  if (removeUnusedMappings) {
    const importsUsed = {};
    topLevelMappingsUsed.forEach(({
      from,
      to
    }) => {
      importsUsed[from] = to;
    });
    const scopesUsed = {};
    Object.keys(scopedMappingsUsed).forEach(scope => {
      const mappingsUsed = scopedMappingsUsed[scope];
      const scopedMappings = {};
      mappingsUsed.forEach(({
        from,
        to
      }) => {
        scopedMappings[from] = to;
      });
      scopesUsed[scope] = scopedMappings;
    });
    return {
      imports: importsUsed,
      scopes: scopesUsed
    };
  }

  return importmap.composeTwoImportMaps(importMap, {
    imports,
    scopes
  });
};

const tryToResolveImport = async ({
  logger,
  warn,
  specifier,
  importer,
  importedBy,
  projectDirectoryUrl,
  projectPackageFileUrl,
  trackAndResolveImport,
  runtime,
  bareSpecifierAutomapping,
  extensionlessAutomapping,
  magicExtensions,
  performAutomapping
}) => {
  if (runtime === "node" && isSpecifierForNodeCoreModule_js.isSpecifierForNodeCoreModule(specifier)) {
    return null;
  }

  let gotBareSpecifierError = false;
  let fileUrl;

  try {
    fileUrl = trackAndResolveImport(specifier, importer);
  } catch (e) {
    if (e !== BARE_SPECIFIER_ERROR) {
      throw e;
    }

    gotBareSpecifierError = true;

    if (importer === projectPackageFileUrl) {
      // cannot find package main file (package.main is "" for instance)
      // we can't discover main file and parse dependencies
      return null;
    }

    fileUrl = filesystem.resolveUrl(specifier, importer);
  }

  const {
    magicExtension,
    found,
    url
  } = await resolveFile(fileUrl, {
    magicExtensionEnabled: true,
    magicExtensions: magicExtensionWithImporterExtension(magicExtensions || [], importer)
  });
  const packageDirectoryUrl = packageDirectoryUrlFromUrl(url, projectDirectoryUrl);
  const packageFileUrl = filesystem.resolveUrl("package.json", packageDirectoryUrl);
  const scope = packageFileUrl === projectPackageFileUrl ? undefined : `./${filesystem.urlToRelativeUrl(packageDirectoryUrl, projectDirectoryUrl)}`;
  const automapping = {
    scope,
    from: specifier,
    to: `./${filesystem.urlToRelativeUrl(url, projectDirectoryUrl)}`
  };

  if (gotBareSpecifierError) {
    if (!found) {
      warn(createImportResolutionFailedWarning({
        specifier,
        importedBy,
        gotBareSpecifierError,
        suggestsNodeRuntime: runtime !== "node" && isSpecifierForNodeCoreModule_js.isSpecifierForNodeCoreModule(specifier)
      }));
      return null;
    }

    if (!bareSpecifierAutomapping) {
      warn(createImportResolutionFailedWarning({
        specifier,
        importedBy,
        gotBareSpecifierError,
        automapping
      }));
      return null;
    }

    logger.debug(createBareSpecifierAutomappingMessage({
      specifier,
      importedBy,
      automapping
    }));
    performAutomapping(automapping);
    return url;
  }

  if (!found) {
    warn(createImportResolutionFailedWarning({
      specifier,
      importedBy
    }));
    return null;
  }

  if (magicExtension) {
    if (!extensionlessAutomapping) {
      const mappingFoundInPackageExports = await extensionIsMappedInPackageExports(packageFileUrl);

      if (!mappingFoundInPackageExports) {
        warn(createImportResolutionFailedWarning({
          specifier,
          importedBy,
          magicExtension,
          automapping
        }));
        return null;
      }

      logger.debug(createExtensionLessAutomappingMessage({
        specifier,
        importedBy,
        automapping,
        mappingFoundInPackageExports
      }));
      performAutomapping(automapping);
      return url;
    }

    logger.debug(createExtensionLessAutomappingMessage({
      specifier,
      importedBy,
      automapping
    }));
    performAutomapping(automapping);
    return url;
  }

  return url;
};

const extensionIsMappedInPackageExports = async packageFileUrl => {
  const closestPackageObject = await filesystem.readFile(packageFileUrl, {
    as: "json"
  }); // it's imprecise because we are not ensuring the wildcard correspond
  // to the required mapping, but good enough for now

  const containsWildcard = Object.keys(closestPackageObject.exports || {}).some(key => key.includes("*"));
  return containsWildcard;
};

const packageDirectoryUrlFromUrl = (url, projectDirectoryUrl) => {
  const relativeUrl = filesystem.urlToRelativeUrl(url, projectDirectoryUrl);
  const lastNodeModulesDirectoryStartIndex = relativeUrl.lastIndexOf("node_modules/");

  if (lastNodeModulesDirectoryStartIndex === -1) {
    return projectDirectoryUrl;
  }

  const lastNodeModulesDirectoryEndIndex = lastNodeModulesDirectoryStartIndex + `node_modules/`.length;
  const beforeNodeModulesLastDirectory = relativeUrl.slice(0, lastNodeModulesDirectoryEndIndex);
  const afterLastNodeModulesDirectory = relativeUrl.slice(lastNodeModulesDirectoryEndIndex);
  const remainingDirectories = afterLastNodeModulesDirectory.split("/");

  if (afterLastNodeModulesDirectory[0] === "@") {
    // scoped package
    return `${projectDirectoryUrl}${beforeNodeModulesLastDirectory}${remainingDirectories.slice(0, 2).join("/")}`;
  }

  return `${projectDirectoryUrl}${beforeNodeModulesLastDirectory}${remainingDirectories[0]}/`;
};

const magicExtensionWithImporterExtension = (magicExtensions, importer) => {
  const importerExtension = filesystem.urlToExtension(importer);
  const magicExtensionsWithoutImporterExtension = magicExtensions.filter(ext => ext !== importerExtension);
  return [importerExtension, ...magicExtensionsWithoutImporterExtension];
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

const writeImportMapFiles = async ({
  logLevel,
  projectDirectoryUrl,
  importMapFiles,
  packagesManualOverrides,
  onWarn = (warning, warn) => {
    warn(warning);
  },
  writeFiles = true,
  // for unit test
  jsConfigFileUrl
}) => {
  const logger$1 = logger.createLogger({
    logLevel
  });
  const warn = wrapWarnToWarnOnce(warning => {
    onWarn(warning, () => {
      logger$1.warn(`\n${warning.message}\n`);
    });
  });
  projectDirectoryUrl = filesystem.assertAndNormalizeDirectoryUrl(projectDirectoryUrl);

  if (typeof importMapFiles !== "object" || importMapFiles === null) {
    throw new TypeError(`importMapFiles must be an object, received ${importMapFiles}`);
  }

  const importMapFileRelativeUrls = Object.keys(importMapFiles);
  const importMapFileCount = importMapFileRelativeUrls.length;

  if (importMapFileCount.length) {
    throw new Error(`importMapFiles object is empty`);
  }

  const importMaps = {};
  const nodeResolutionVisitors = [];
  importMapFileRelativeUrls.forEach(importMapFileRelativeUrl => {
    const importMapConfig = importMapFiles[importMapFileRelativeUrl];
    const {
      initialImportMap = {}
    } = importMapConfig;
    const topLevelMappings = initialImportMap.imports || {};
    const scopedMappings = initialImportMap.scopes || {};
    const importMap = {
      imports: topLevelMappings,
      scopes: scopedMappings
    };
    importMaps[importMapFileRelativeUrl] = importMap;
    const {
      mappingsForNodeResolution,
      mappingsForDevDependencies,
      packageUserConditions,
      packageIncludedPredicate,
      runtime = "browser"
    } = importMapConfig;

    if (mappingsForNodeResolution) {
      nodeResolutionVisitors.push({
        mappingsForDevDependencies,
        packageConditions: packageConditionsFromPackageUserConditions({
          runtime,
          packageUserConditions
        }),
        packageIncludedPredicate,
        onMapping: ({
          scope,
          from,
          to
        }) => {
          if (scope) {
            scopedMappings[scope] = { ...(scopedMappings[scope] || {}),
              [from]: to
            };
          } else {
            topLevelMappings[from] = to;
          }
        }
      });
    }
  });

  if (nodeResolutionVisitors.length > 0) {
    await visitNodeModuleResolution({
      logger: logger$1,
      warn,
      projectDirectoryUrl,
      visitors: nodeResolutionVisitors,
      packagesManualOverrides
    });
  }

  await importMapFileRelativeUrls.reduce(async (previous, importMapFileRelativeUrl) => {
    const importMapConfig = importMapFiles[importMapFileRelativeUrl];
    const {
      checkImportResolution,
      // ideally we could enable extensionlessAutomapping and bareSpecifierAutomappingonly for a subset
      // of files. Not that hard to do, especially using @jsenv/url-meta
      // but that's super extra fine tuning that I don't have time/energy to do for now
      bareSpecifierAutomapping,
      extensionlessAutomapping,
      magicExtensions,
      removeUnusedMappings,
      runtime = "browser"
    } = importMapConfig;

    if (checkImportResolution || bareSpecifierAutomapping || extensionlessAutomapping || removeUnusedMappings) {
      if (checkImportResolution === false) {
        logger$1.warn(`"checkImportResolution" cannot be disabled when automapping or "removeUnusedMappings" are enabled`);
      }

      if (extensionlessAutomapping && !magicExtensions) {
        logger$1.warn(`"magicExtensions" is required when "extensionlessAutomapping" is enabled`);
      }

      const importMap = await visitSourceFiles({
        logger: logger$1,
        warn,
        projectDirectoryUrl,
        importMap: importMaps[importMapFileRelativeUrl],
        bareSpecifierAutomapping,
        extensionlessAutomapping,
        magicExtensions,
        removeUnusedMappings,
        runtime
      });
      importMaps[importMapFileRelativeUrl] = importMap;
    }
  }, Promise.resolve());
  Object.keys(importMaps).forEach(key => {
    const importMap = importMaps[key];
    const importMapNormalized = importmap.sortImportMap(optimizeImportMap(importMap));
    importMaps[key] = importMapNormalized;
  });

  if (writeFiles) {
    await importMapFileRelativeUrls.reduce(async (previous, importMapFileRelativeUrl) => {
      await previous;
      const importmapFileUrl = filesystem.resolveUrl(importMapFileRelativeUrl, projectDirectoryUrl);
      const importMap = importMaps[importMapFileRelativeUrl];
      await filesystem.writeFile(importmapFileUrl, JSON.stringify(importMap, null, "  "));
      logger$1.info(`-> ${filesystem.urlToFileSystemPath(importmapFileUrl)}`);
    }, Promise.resolve());
  }

  const firstUpdatingJsConfig = importMapFileRelativeUrls.find(importMapFileRelativeUrl => {
    const importMapFileConfig = importMapFiles[importMapFileRelativeUrl];
    return importMapFileConfig.useForJsConfigJSON;
  });

  if (firstUpdatingJsConfig) {
    jsConfigFileUrl = jsConfigFileUrl || filesystem.resolveUrl("./jsconfig.json", projectDirectoryUrl);
    const jsConfigCurrent = (await readCurrentJsConfig(jsConfigFileUrl)) || {
      compilerOptions: {}
    };
    const importMapUsedForVsCode = importMaps[firstUpdatingJsConfig];
    const jsConfigPaths = importMapToVsCodeConfigPaths(importMapUsedForVsCode);
    const jsConfig = { ...jsConfigDefault,
      ...jsConfigCurrent,
      compilerOptions: { ...jsConfigDefault.compilerOptions,
        ...jsConfigCurrent.compilerOptions,
        // importmap is the source of truth -> paths are overwritten
        // We coudldn't differentiate which one we created and which one where added manually anyway
        paths: jsConfigPaths
      }
    };
    await filesystem.writeFile(jsConfigFileUrl, JSON.stringify(jsConfig, null, "  "));
    logger$1.info(`-> ${filesystem.urlToFileSystemPath(jsConfigFileUrl)}`);
  }

  return importMaps;
};

const packageConditionsFromPackageUserConditions = ({
  runtime,
  packageUserConditions
}) => {
  if (typeof packageUserConditions === "undefined") {
    return ["import", runtime, "default"];
  }

  if (!Array.isArray(packageUserConditions)) {
    throw new TypeError(`packageUserConditions must be an array, got ${packageUserConditions}`);
  }

  packageUserConditions.forEach(userCondition => {
    if (typeof userCondition !== "string") {
      throw new TypeError(`user condition must be a string, got ${userCondition}`);
    }
  });
  return [...packageUserConditions, "import", runtime, "default"];
};

const wrapWarnToWarnOnce = warn => {
  const warnings = [];
  return warning => {
    const alreadyWarned = warnings.some(warningCandidate => {
      return JSON.stringify(warningCandidate) === JSON.stringify(warning);
    });

    if (alreadyWarned) {
      return;
    }

    if (warnings.length > 1000) {
      warnings.shift();
    }

    warnings.push(warning);
    warn(warning);
  };
};

const jsConfigDefault = {
  compilerOptions: {
    baseUrl: ".",
    paths: {}
  }
};

const readCurrentJsConfig = async jsConfigFileUrl => {
  try {
    const currentJSConfig = await filesystem.readFile(jsConfigFileUrl, {
      as: "json"
    });
    return currentJSConfig;
  } catch (e) {
    return null;
  }
};

exports.writeImportMapFiles = writeImportMapFiles;

//# sourceMappingURL=jsenv_importmap_node_module.cjs.map