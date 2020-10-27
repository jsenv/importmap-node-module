'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var url = require('url');
var fs = require('fs');
require('crypto');
var path = require('path');
var util = require('util');

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

const hasScheme = string => {
  return /^[a-zA-Z]{2,}:/.test(string);
};

const urlToScheme = urlString => {
  const colonIndex = urlString.indexOf(":");
  if (colonIndex === -1) return "";
  return urlString.slice(0, colonIndex);
};

const urlToPathname = urlString => {
  return ressourceToPathname(urlToRessource(urlString));
};

const urlToRessource = urlString => {
  const scheme = urlToScheme(urlString);

  if (scheme === "file") {
    return urlString.slice("file://".length);
  }

  if (scheme === "https" || scheme === "http") {
    // remove origin
    const afterProtocol = urlString.slice(scheme.length + "://".length);
    const pathnameSlashIndex = afterProtocol.indexOf("/", "://".length);
    return afterProtocol.slice(pathnameSlashIndex);
  }

  return urlString.slice(scheme.length + 1);
};

const ressourceToPathname = ressource => {
  const searchSeparatorIndex = ressource.indexOf("?");
  return searchSeparatorIndex === -1 ? ressource : ressource.slice(0, searchSeparatorIndex);
};

const urlToOrigin = urlString => {
  const scheme = urlToScheme(urlString);

  if (scheme === "file") {
    return "file://";
  }

  if (scheme === "http" || scheme === "https") {
    const secondProtocolSlashIndex = scheme.length + "://".length;
    const pathnameSlashIndex = urlString.indexOf("/", secondProtocolSlashIndex);
    if (pathnameSlashIndex === -1) return urlString;
    return urlString.slice(0, pathnameSlashIndex);
  }

  return urlString.slice(0, scheme.length + 1);
};

const pathnameToParentPathname = pathname => {
  const slashLastIndex = pathname.lastIndexOf("/");

  if (slashLastIndex === -1) {
    return "/";
  }

  return pathname.slice(0, slashLastIndex + 1);
};

// could be useful: https://url.spec.whatwg.org/#url-miscellaneous
const resolveUrl = (specifier, baseUrl) => {
  if (baseUrl) {
    if (typeof baseUrl !== "string") {
      throw new TypeError(writeBaseUrlMustBeAString({
        baseUrl,
        specifier
      }));
    }

    if (!hasScheme(baseUrl)) {
      throw new Error(writeBaseUrlMustBeAbsolute({
        baseUrl,
        specifier
      }));
    }
  }

  if (hasScheme(specifier)) {
    return specifier;
  }

  if (!baseUrl) {
    throw new Error(writeBaseUrlRequired({
      baseUrl,
      specifier
    }));
  } // scheme relative


  if (specifier.slice(0, 2) === "//") {
    return `${urlToScheme(baseUrl)}:${specifier}`;
  } // origin relative


  if (specifier[0] === "/") {
    return `${urlToOrigin(baseUrl)}${specifier}`;
  }

  const baseOrigin = urlToOrigin(baseUrl);
  const basePathname = urlToPathname(baseUrl);

  if (specifier === ".") {
    const baseDirectoryPathname = pathnameToParentPathname(basePathname);
    return `${baseOrigin}${baseDirectoryPathname}`;
  } // pathname relative inside


  if (specifier.slice(0, 2) === "./") {
    const baseDirectoryPathname = pathnameToParentPathname(basePathname);
    return `${baseOrigin}${baseDirectoryPathname}${specifier.slice(2)}`;
  } // pathname relative outside


  if (specifier.slice(0, 3) === "../") {
    let unresolvedPathname = specifier;
    const importerFolders = basePathname.split("/");
    importerFolders.pop();

    while (unresolvedPathname.slice(0, 3) === "../") {
      unresolvedPathname = unresolvedPathname.slice(3); // when there is no folder left to resolved
      // we just ignore '../'

      if (importerFolders.length) {
        importerFolders.pop();
      }
    }

    const resolvedPathname = `${importerFolders.join("/")}/${unresolvedPathname}`;
    return `${baseOrigin}${resolvedPathname}`;
  } // bare


  if (basePathname === "") {
    return `${baseOrigin}/${specifier}`;
  }

  if (basePathname[basePathname.length] === "/") {
    return `${baseOrigin}${basePathname}${specifier}`;
  }

  return `${baseOrigin}${pathnameToParentPathname(basePathname)}${specifier}`;
};

const writeBaseUrlMustBeAString = ({
  baseUrl,
  specifier
}) => `baseUrl must be a string.
--- base url ---
${baseUrl}
--- specifier ---
${specifier}`;

const writeBaseUrlMustBeAbsolute = ({
  baseUrl,
  specifier
}) => `baseUrl must be absolute.
--- base url ---
${baseUrl}
--- specifier ---
${specifier}`;

const writeBaseUrlRequired = ({
  baseUrl,
  specifier
}) => `baseUrl required to resolve relative specifier.
--- base url ---
${baseUrl}
--- specifier ---
${specifier}`;

const resolveSpecifier = (specifier, importer) => {
  if (specifier === "." || specifier[0] === "/" || specifier.startsWith("./") || specifier.startsWith("../")) {
    return resolveUrl(specifier, importer);
  }

  if (hasScheme(specifier)) {
    return specifier;
  }

  return null;
};

// https://github.com/systemjs/systemjs/blob/89391f92dfeac33919b0223bbf834a1f4eea5750/src/common.js#L136
const composeTwoImportMaps = (leftImportMap, rightImportMap) => {
  assertImportMap(leftImportMap);
  assertImportMap(rightImportMap);
  const importMap = {};
  const leftImports = leftImportMap.imports;
  const rightImports = rightImportMap.imports;
  const leftHasImports = Boolean(leftImports);
  const rightHasImports = Boolean(rightImports);

  if (leftHasImports && rightHasImports) {
    importMap.imports = composeTwoImports(leftImports, rightImports);
  } else if (leftHasImports) {
    importMap.imports = { ...leftImports
    };
  } else if (rightHasImports) {
    importMap.imports = { ...rightImports
    };
  }

  const leftScopes = leftImportMap.scopes;
  const rightScopes = rightImportMap.scopes;
  const leftHasScopes = Boolean(leftScopes);
  const rightHasScopes = Boolean(rightScopes);

  if (leftHasScopes && rightHasScopes) {
    importMap.scopes = composeTwoScopes(leftScopes, rightScopes);
  } else if (leftHasScopes) {
    importMap.scopes = { ...leftScopes
    };
  } else if (rightHasScopes) {
    importMap.scopes = { ...rightScopes
    };
  }

  return importMap;
};

const composeTwoImports = (leftImports, rightImports) => {
  return { ...leftImports,
    ...rightImports
  };
};

const composeTwoScopes = (leftScopes, rightScopes) => {
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

  if (baseSpecificPathname.includes("/")) {
    const baseSpecificParentPathname = pathnameToParentPathname(baseSpecificPathname);
    const relativeDirectoriesNotation = baseSpecificParentPathname.replace(/.*?\//g, "../");
    return `${relativeDirectoriesNotation}${specificPathname}${search}${hash}`;
  }

  return `${specificPathname}${search}${hash}`;
};

const moveImportMap = (importMap, fromUrl, toUrl) => {
  assertImportMap(importMap);

  const makeRelativeTo = (value, type) => {
    let url;

    if (type === "specifier") {
      url = resolveSpecifier(value, fromUrl);

      if (!url) {
        // bare specifier
        return value;
      }
    } else {
      url = resolveUrl(value, fromUrl);
    }

    const relativeUrl = urlToRelativeUrl(url, toUrl);

    if (relativeUrl.startsWith("../")) {
      return relativeUrl;
    }

    if (relativeUrl.startsWith("./")) {
      return relativeUrl;
    }

    if (hasScheme(relativeUrl)) {
      return relativeUrl;
    }

    return `./${relativeUrl}`;
  };

  const importMapRelative = {};
  const {
    imports
  } = importMap;

  if (imports) {
    importMapRelative.imports = makeImportsRelativeTo(imports, makeRelativeTo) || imports;
  }

  const {
    scopes
  } = importMap;

  if (scopes) {
    importMapRelative.scopes = makeScopedRemappingRelativeTo(scopes, makeRelativeTo) || scopes;
  } // nothing changed


  if (importMapRelative.imports === imports && importMapRelative.scopes === scopes) {
    return importMap;
  }

  return importMapRelative;
};

const makeScopedRemappingRelativeTo = (scopes, makeRelativeTo) => {
  const scopesTransformed = {};
  const scopesRemaining = {};
  let transformed = false;
  Object.keys(scopes).forEach(scopeKey => {
    const scopeValue = scopes[scopeKey];
    const scopeKeyRelative = makeRelativeTo(scopeKey, "address");
    const scopeValueRelative = makeImportsRelativeTo(scopeValue, makeRelativeTo);

    if (scopeKeyRelative) {
      transformed = true;
      scopesTransformed[scopeKeyRelative] = scopeValueRelative || scopeValue;
    } else if (scopeValueRelative) {
      transformed = true;
      scopesTransformed[scopeKey] = scopeValueRelative;
    } else {
      scopesRemaining[scopeKey] = scopeValueRelative;
    }
  });
  return transformed ? { ...scopesTransformed,
    ...scopesRemaining
  } : null;
};

const makeImportsRelativeTo = (imports, makeRelativeTo) => {
  const importsTransformed = {};
  const importsRemaining = {};
  let transformed = false;
  Object.keys(imports).forEach(importKey => {
    const importValue = imports[importKey];
    const importKeyRelative = makeRelativeTo(importKey, "specifier");
    const importValueRelative = makeRelativeTo(importValue, "address");

    if (importKeyRelative) {
      transformed = true;
      importsTransformed[importKeyRelative] = importValueRelative || importValue;
    } else if (importValueRelative) {
      transformed = true;
      importsTransformed[importKey] = importValueRelative;
    } else {
      importsRemaining[importKey] = importValue;
    }
  });
  return transformed ? { ...importsTransformed,
    ...importsRemaining
  } : null;
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

const ensureUrlTrailingSlash = url => {
  return url.endsWith("/") ? url : `${url}/`;
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

  return String(url.pathToFileURL(value));
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

const assertAndNormalizeFileUrl = (value, baseUrl) => {
  let urlString;

  if (value instanceof URL) {
    urlString = value.href;
  } else if (typeof value === "string") {
    if (isFileSystemPath(value)) {
      urlString = fileSystemPathToUrl(value);
    } else {
      try {
        urlString = String(new URL(value, baseUrl));
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

const statsToType = stats => {
  if (stats.isFile()) return "file";
  if (stats.isDirectory()) return "directory";
  if (stats.isSymbolicLink()) return "symbolic-link";
  if (stats.isFIFO()) return "fifo";
  if (stats.isSocket()) return "socket";
  if (stats.isCharacterDevice()) return "character-device";
  if (stats.isBlockDevice()) return "block-device";
  return undefined;
};

const urlToFileSystemPath = fileUrl => {
  if (fileUrl[fileUrl.length - 1] === "/") {
    // remove trailing / so that nodejs path becomes predictable otherwise it logs
    // the trailing slash on linux but does not on windows
    fileUrl = fileUrl.slice(0, -1);
  }

  const fileSystemPath = url.fileURLToPath(fileUrl);
  return fileSystemPath;
};

// https://github.com/coderaiser/cloudcmd/issues/63#issuecomment-195478143
// https://nodejs.org/api/fs.html#fs_file_modes
// https://github.com/TooTallNate/stat-mode
// cannot get from fs.constants because they are not available on windows
const S_IRUSR = 256;
/* 0000400 read permission, owner */

const S_IWUSR = 128;
/* 0000200 write permission, owner */

const S_IXUSR = 64;
/* 0000100 execute/search permission, owner */

const S_IRGRP = 32;
/* 0000040 read permission, group */

const S_IWGRP = 16;
/* 0000020 write permission, group */

const S_IXGRP = 8;
/* 0000010 execute/search permission, group */

const S_IROTH = 4;
/* 0000004 read permission, others */

const S_IWOTH = 2;
/* 0000002 write permission, others */

const S_IXOTH = 1;
const permissionsToBinaryFlags = ({
  owner,
  group,
  others
}) => {
  let binaryFlags = 0;
  if (owner.read) binaryFlags |= S_IRUSR;
  if (owner.write) binaryFlags |= S_IWUSR;
  if (owner.execute) binaryFlags |= S_IXUSR;
  if (group.read) binaryFlags |= S_IRGRP;
  if (group.write) binaryFlags |= S_IWGRP;
  if (group.execute) binaryFlags |= S_IXGRP;
  if (others.read) binaryFlags |= S_IROTH;
  if (others.write) binaryFlags |= S_IWOTH;
  if (others.execute) binaryFlags |= S_IXOTH;
  return binaryFlags;
};

const writeFileSystemNodePermissions = async (source, permissions) => {
  const sourceUrl = assertAndNormalizeFileUrl(source);
  const sourcePath = urlToFileSystemPath(sourceUrl);
  let binaryFlags;

  if (typeof permissions === "object") {
    permissions = {
      owner: {
        read: getPermissionOrComputeDefault("read", "owner", permissions),
        write: getPermissionOrComputeDefault("write", "owner", permissions),
        execute: getPermissionOrComputeDefault("execute", "owner", permissions)
      },
      group: {
        read: getPermissionOrComputeDefault("read", "group", permissions),
        write: getPermissionOrComputeDefault("write", "group", permissions),
        execute: getPermissionOrComputeDefault("execute", "group", permissions)
      },
      others: {
        read: getPermissionOrComputeDefault("read", "others", permissions),
        write: getPermissionOrComputeDefault("write", "others", permissions),
        execute: getPermissionOrComputeDefault("execute", "others", permissions)
      }
    };
    binaryFlags = permissionsToBinaryFlags(permissions);
  } else {
    binaryFlags = permissions;
  }

  return chmodNaive(sourcePath, binaryFlags);
};

const chmodNaive = (fileSystemPath, binaryFlags) => {
  return new Promise((resolve, reject) => {
    fs.chmod(fileSystemPath, binaryFlags, error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

const actionLevels = {
  read: 0,
  write: 1,
  execute: 2
};
const subjectLevels = {
  others: 0,
  group: 1,
  owner: 2
};

const getPermissionOrComputeDefault = (action, subject, permissions) => {
  if (subject in permissions) {
    const subjectPermissions = permissions[subject];

    if (action in subjectPermissions) {
      return subjectPermissions[action];
    }

    const actionLevel = actionLevels[action];
    const actionFallback = Object.keys(actionLevels).find(actionFallbackCandidate => actionLevels[actionFallbackCandidate] > actionLevel && actionFallbackCandidate in subjectPermissions);

    if (actionFallback) {
      return subjectPermissions[actionFallback];
    }
  }

  const subjectLevel = subjectLevels[subject]; // do we have a subject with a stronger level (group or owner)
  // where we could read the action permission ?

  const subjectFallback = Object.keys(subjectLevels).find(subjectFallbackCandidate => subjectLevels[subjectFallbackCandidate] > subjectLevel && subjectFallbackCandidate in permissions);

  if (subjectFallback) {
    const subjectPermissions = permissions[subjectFallback];
    return action in subjectPermissions ? subjectPermissions[action] : getPermissionOrComputeDefault(action, subjectFallback, permissions);
  }

  return false;
};

const isWindows = process.platform === "win32";
const readFileSystemNodeStat = async (source, {
  nullIfNotFound = false,
  followLink = true
} = {}) => {
  if (source.endsWith("/")) source = source.slice(0, -1);
  const sourceUrl = assertAndNormalizeFileUrl(source);
  const sourcePath = urlToFileSystemPath(sourceUrl);
  const handleNotFoundOption = nullIfNotFound ? {
    handleNotFoundError: () => null
  } : {};
  return readStat(sourcePath, {
    followLink,
    ...handleNotFoundOption,
    ...(isWindows ? {
      // Windows can EPERM on stat
      handlePermissionDeniedError: async error => {
        console.error(`trying to fix windows EPERM after stats on ${sourcePath}`);

        try {
          // unfortunately it means we mutate the permissions
          // without being able to restore them to the previous value
          // (because reading current permission would also throw)
          await writeFileSystemNodePermissions(sourceUrl, 0o666);
          const stats = await readStat(sourcePath, {
            followLink,
            ...handleNotFoundOption,
            // could not fix the permission error, give up and throw original error
            handlePermissionDeniedError: () => {
              console.error(`still got EPERM after stats on ${sourcePath}`);
              throw error;
            }
          });
          return stats;
        } catch (e) {
          console.error(`error while trying to fix windows EPERM after stats on ${sourcePath}: ${e.stack}`);
          throw error;
        }
      }
    } : {})
  });
};

const readStat = (sourcePath, {
  followLink,
  handleNotFoundError = null,
  handlePermissionDeniedError = null
} = {}) => {
  const nodeMethod = followLink ? fs.stat : fs.lstat;
  return new Promise((resolve, reject) => {
    nodeMethod(sourcePath, (error, statsObject) => {
      if (error) {
        if (handleNotFoundError && error.code === "ENOENT") {
          resolve(handleNotFoundError(error));
        } else if (handlePermissionDeniedError && (error.code === "EPERM" || error.code === "EACCES")) {
          resolve(handlePermissionDeniedError(error));
        } else {
          reject(error);
        }
      } else {
        resolve(statsObject);
      }
    });
  });
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

  const visit = async index => {
    if (index >= array.length) {
      return undefined;
    }

    const input = array[index];
    const output = await start(input);

    if (predicate(output)) {
      return output;
    }

    return visit(index + 1);
  };

  return visit(0);
};

const isCancelError = value => {
  return value && typeof value === "object" && value.name === "CANCEL_ERROR";
};

const getCommandArgument = (argv, name) => {
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    if (arg === name) {
      return {
        name,
        index: i,
        value: ""
      };
    }

    if (arg.startsWith(`${name}=`)) {
      return {
        name,
        index: i,
        value: arg.slice(`${name}=`.length)
      };
    }

    i++;
  }

  return null;
};

const wrapExternalFunction = (fn, {
  catchCancellation = false,
  unhandledRejectionStrict = false
} = {}) => {
  if (catchCancellation) {
    const previousFn = fn;

    fn = async () => {
      try {
        const value = await previousFn();
        return value;
      } catch (error) {
        if (isCancelError(error)) {
          // it means consume of the function will resolve with a cancelError
          // but when you cancel it means you're not interested in the result anymore
          // thanks to this it avoid unhandledRejection
          return error;
        }

        throw error;
      }
    };
  }

  if (unhandledRejectionStrict) {
    const previousFn = fn;

    fn = async () => {
      const uninstall = installUnhandledRejectionStrict();

      try {
        const value = await previousFn();
        uninstall();
        return value;
      } catch (e) {
        // don't remove it immediatly to let nodejs emit the unhandled rejection
        setTimeout(() => {
          uninstall();
        });
        throw e;
      }
    };
  }

  return fn();
};

const installUnhandledRejectionStrict = () => {
  const unhandledRejectionArg = getCommandArgument(process.execArgv, "--unhandled-rejections");
  if (unhandledRejectionArg === "strict") return () => {};

  const onUnhandledRejection = reason => {
    throw reason;
  };

  process.once("unhandledRejection", onUnhandledRejection);
  return () => {
    process.removeListener("unhandledRejection", onUnhandledRejection);
  };
};

const getCommonPathname$1 = (pathname, otherPathname) => {
  const firstDifferentCharacterIndex = findFirstDifferentCharacterIndex$1(pathname, otherPathname); // pathname and otherpathname are exactly the same

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

const findFirstDifferentCharacterIndex$1 = (string, otherString) => {
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

const pathnameToParentPathname$1 = pathname => {
  const slashLastIndex = pathname.lastIndexOf("/");

  if (slashLastIndex === -1) {
    return "/";
  }

  return pathname.slice(0, slashLastIndex + 1);
};

const urlToRelativeUrl$1 = (urlArg, baseUrlArg) => {
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
  const commonPathname = getCommonPathname$1(pathname, basePathname);

  if (!commonPathname) {
    return urlArg;
  }

  const specificPathname = pathname.slice(commonPathname.length);
  const baseSpecificPathname = basePathname.slice(commonPathname.length);

  if (baseSpecificPathname.includes("/")) {
    const baseSpecificParentPathname = pathnameToParentPathname$1(baseSpecificPathname);
    const relativeDirectoriesNotation = baseSpecificParentPathname.replace(/.*?\//g, "../");
    return `${relativeDirectoriesNotation}${specificPathname}${search}${hash}`;
  }

  return `${specificPathname}${search}${hash}`;
};

const {
  mkdir
} = fs.promises;
const writeDirectory = async (destination, {
  recursive = true,
  allowUseless = false
} = {}) => {
  const destinationUrl = assertAndNormalizeDirectoryUrl(destination);
  const destinationPath = urlToFileSystemPath(destinationUrl);
  const destinationStats = await readFileSystemNodeStat(destinationUrl, {
    nullIfNotFound: true,
    followLink: false
  });

  if (destinationStats) {
    if (destinationStats.isDirectory()) {
      if (allowUseless) {
        return;
      }

      throw new Error(`directory already exists at ${destinationPath}`);
    }

    const destinationType = statsToType(destinationStats);
    throw new Error(`cannot write directory at ${destinationPath} because there is a ${destinationType}`);
  }

  try {
    await mkdir(destinationPath, {
      recursive
    });
  } catch (error) {
    if (allowUseless && error.code === "EEXIST") {
      return;
    }

    throw error;
  }
};

const resolveUrl$1 = (specifier, baseUrl) => {
  if (typeof baseUrl === "undefined") {
    throw new TypeError(`baseUrl missing to resolve ${specifier}`);
  }

  return String(new URL(specifier, baseUrl));
};

const ensureParentDirectories = async destination => {
  const destinationUrl = assertAndNormalizeFileUrl(destination);
  const destinationPath = urlToFileSystemPath(destinationUrl);
  const destinationParentPath = path.dirname(destinationPath);
  return writeDirectory(destinationParentPath, {
    recursive: true,
    allowUseless: true
  });
};

const isWindows$1 = process.platform === "win32";
const baseUrlFallback = fileSystemPathToUrl(process.cwd());

const isWindows$2 = process.platform === "win32";

const readFilePromisified = util.promisify(fs.readFile);
const readFile = async (value, {
  as = "string"
} = {}) => {
  const fileUrl = assertAndNormalizeFileUrl(value);
  const filePath = urlToFileSystemPath(fileUrl);
  const buffer = await readFilePromisified(filePath);

  if (as === "buffer") {
    return buffer;
  }

  if (as === "string") {
    return buffer.toString();
  }

  if (as === "json") {
    return JSON.parse(buffer.toString());
  }

  throw new Error(`as must be one of buffer,string,json, received ${as}.`);
};

const isWindows$3 = process.platform === "win32";

/* eslint-disable import/max-dependencies */
const isLinux = process.platform === "linux"; // linux does not support recursive option

const urlToScheme$1 = urlString => {
  const colonIndex = urlString.indexOf(":");

  if (colonIndex === -1) {
    return "";
  }

  const scheme = urlString.slice(0, colonIndex);
  return scheme;
};

const urlToRessource$1 = urlString => {
  const scheme = urlToScheme$1(urlString);

  if (scheme === "file") {
    return urlString.slice("file://".length);
  }

  if (scheme === "https" || scheme === "http") {
    // remove origin
    const afterProtocol = urlString.slice(scheme.length + "://".length);
    const pathnameSlashIndex = afterProtocol.indexOf("/", "://".length);
    return afterProtocol.slice(pathnameSlashIndex);
  }

  return urlString.slice(scheme.length + 1);
};

const urlToPathname$1 = urlString => {
  const ressource = urlToRessource$1(urlString);
  const pathname = ressourceToPathname$1(ressource);
  return pathname;
};

const ressourceToPathname$1 = ressource => {
  const searchSeparatorIndex = ressource.indexOf("?");
  return searchSeparatorIndex === -1 ? ressource : ressource.slice(0, searchSeparatorIndex);
};

const urlToFilename = url => {
  const pathname = urlToPathname$1(url);
  const slashLastIndex = pathname.lastIndexOf("/");
  const filename = slashLastIndex === -1 ? pathname : pathname.slice(slashLastIndex + 1);
  return filename;
};

const urlToBasename = pathname => {
  const filename = urlToFilename(pathname);
  const dotLastIndex = filename.lastIndexOf(".");
  const basename = dotLastIndex === -1 ? filename : filename.slice(0, dotLastIndex);
  return basename;
};

const {
  writeFile: writeFileNode
} = fs.promises;
const writeFile = async (destination, content = "") => {
  const destinationUrl = assertAndNormalizeFileUrl(destination);
  const destinationPath = urlToFileSystemPath(destinationUrl);

  try {
    await writeFileNode(destinationPath, content);
  } catch (error) {
    if (error.code === "ENOENT") {
      await ensureParentDirectories(destinationUrl);
      await writeFileNode(destinationPath, content);
      return;
    }

    throw error;
  }
};

const readPackageFile = async (packageFileUrl, packagesManualOverrides) => {
  const packageFileString = await readFile(packageFileUrl);
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
  const packageDirectoryUrl = resolveUrl$1("./", packageFileUrl);
  const nodeModuleCandidateArray = [...computeNodeModuleCandidateArray(packageDirectoryUrl, rootProjectDirectoryUrl), `node_modules/`];
  return firstOperationMatching({
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
};

const computeNodeModuleCandidateArray = (packageDirectoryUrl, rootProjectDirectoryUrl) => {
  if (packageDirectoryUrl === rootProjectDirectoryUrl) {
    return [];
  }

  const packageDirectoryRelativeUrl = urlToRelativeUrl$1(packageDirectoryUrl, rootProjectDirectoryUrl);
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

  const packageFilePath = urlToFileSystemPath(packageFileUrl);
  const packageDirectoryUrl = resolveUrl$1("./", packageFileUrl);
  const mainFileRelativeUrl = packageMainFieldValue.endsWith("/") ? `${packageMainFieldValue}index` : packageMainFieldValue;
  const mainFileUrlFirstCandidate = resolveUrl$1(mainFileRelativeUrl, packageFileUrl);

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
      const extensionTried = path.extname(urlToFileSystemPath(mainFileUrlFirstCandidate)) === "" ? `--- extensions tried ---
${extensionCandidateArray.join(`,`)}
` : `
`;
      logger.warn(`
cannot find file for package.json ${packageMainFieldName} field
--- ${packageMainFieldName} ---
${packageMainFieldValue}
--- file path ---
${urlToFileSystemPath(mainFileUrlFirstCandidate)}
--- package.json path ---
${packageFilePath}
${extensionTried}`);
    }

    return mainFileUrlFirstCandidate;
  }

  return mainFileUrl;
};

const findMainFileUrlOrNull = async mainFileUrl => {
  const mainStats = await readFileSystemNodeStat(mainFileUrl, {
    nullIfNotFound: true
  });

  if (mainStats && mainStats.isFile()) {
    return mainFileUrl;
  }

  if (mainStats && mainStats.isDirectory()) {
    const indexFileUrl = resolveUrl$1("./index", mainFileUrl.endsWith("/") ? mainFileUrl : `${mainFileUrl}/`);
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
      const stats = await readFileSystemNodeStat(filePathCandidate, {
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
  packagesExportsPreference
}) => {
  const importsForPackageExports = {};
  const packageFilePath = urlToFileSystemPath(packageFileUrl);
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
  packagesManualOverrides = {}
}) => wrapExternalFunction(async () => {
  const logger = createLogger({
    logLevel
  });
  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl);

  if (typeof rootProjectDirectoryUrl === "undefined") {
    rootProjectDirectoryUrl = projectDirectoryUrl;
  } else {
    rootProjectDirectoryUrl = assertAndNormalizeDirectoryUrl(rootProjectDirectoryUrl);
  }

  const projectPackageFileUrl = resolveUrl$1("./package.json", projectDirectoryUrl);
  const rootProjectPackageFileUrl = resolveUrl$1("./package.json", rootProjectDirectoryUrl);
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
        logger,
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
        logger,
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
      logger
    }); // it's possible to have no main
    // like { main: "" } in package.json
    // or a main that does not lead to an actual file

    if (mainFileUrl === null) return;
    const mainFileRelativeUrl = urlToRelativeUrl$1(mainFileUrl, rootProjectDirectoryUrl);
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
      logger[dependencyIsOptional ? "debug" : "warn"](`
${dependencyIsOptional ? `cannot find an optional ${dependencyType}.` : `cannot find a ${dependencyType}.`}
--- ${dependencyType} ---
${dependencyName}@${dependencyVersionPattern}
--- required by ---
${packageJsonObject.name}@${packageJsonObject.version}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}
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
    const importerPackageDirectoryUrl = resolveUrl$1("./", importerPackageFileUrl);
    const importerRelativeUrl = importerIsRoot ? `${urlToBasename(rootProjectDirectoryUrl.slice(0, -1))}/` : urlToRelativeUrl$1(importerPackageDirectoryUrl, rootProjectDirectoryUrl);
    const packageIsRoot = packageFileUrl === rootProjectPackageFileUrl;
    const packageIsProject = packageFileUrl === projectPackageFileUrl;
    const packageDirectoryUrl = resolveUrl$1("./", packageFileUrl);
    let packageDirectoryUrlExpected;

    if (packageIsProject && !packageIsRoot) {
      packageDirectoryUrlExpected = importerPackageDirectoryUrl;
    } else {
      packageDirectoryUrlExpected = `${importerPackageDirectoryUrl}node_modules/${packageName}/`;
    }

    const packageDirectoryRelativeUrl = urlToRelativeUrl$1(packageDirectoryUrl, rootProjectDirectoryUrl);
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
      logger,
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
  }); // The importmap generated at this point is relative to the project directory url
  // In other words if you want to use that importmap you have to put it
  // inside projectDirectoryUrl (it cannot be nested in a subdirectory).

  let importMap = {
    imports,
    scopes
  };

  if (importMapFileRelativeUrl) {
    // When there is an importMapFileRelativeUrl we will make remapping relative
    // to the importmap file future location (where user will write it).
    // This allows to put the importmap anywhere inside the projectDirectoryUrl.
    // (If possible prefer to have it top level to avoid too many ../
    const importMapProjectUrl = resolveUrl$1("project.importmap", projectDirectoryUrl);
    const importMapRealUrl = resolveUrl$1(importMapFileRelativeUrl, projectDirectoryUrl);
    importMap = moveImportMap(importMap, importMapProjectUrl, importMapRealUrl);
  }

  importMap = sortImportMap(importMap);
  return importMap;
}, {
  catchCancellation: true,
  unhandledRejectionStrict: false
});

const getImportMapFromFile = async importMapFilePath => {
  const importMapFileUrl = assertAndNormalizeFileUrl(importMapFilePath);
  const importMapFileContent = await readFile(importMapFileUrl);
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
  jsConfigLeadingSlash = false
}) => wrapExternalFunction(async () => {
  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl);

  if (importMapInputs.length === 0) {
    console.warn(`importMapInputs is empty, the generated importmap will be empty`);
  }

  const importMaps = await Promise.all(importMapInputs);
  const importMap = importMaps.reduce((previous, current) => {
    return composeTwoImportMaps(previous, current);
  }, {});

  if (importMapFile) {
    const importMapFileUrl = resolveUrl$1(importMapFileRelativeUrl, projectDirectoryUrl);
    await writeFile(importMapFileUrl, JSON.stringify(importMap, null, "  "));

    if (importMapFileLog) {
      console.info(`-> ${urlToFileSystemPath(importMapFileUrl)}`);
    }
  }

  if (jsConfigFile) {
    const jsConfigFileUrl = resolveUrl$1("./jsconfig.json", projectDirectoryUrl);

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
      await writeFile(jsConfigFileUrl, JSON.stringify(jsConfig, null, "  "));

      if (jsConfigFileLog) {
        console.info(`-> ${urlToFileSystemPath(jsConfigFileUrl)}`);
      }
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw e;
      }
    }
  }

  return importMap;
}, {
  catchCancellation: true,
  unhandledRejectionStrict: false
});

exports.generateImportMapForProject = generateImportMapForProject;
exports.getImportMapFromFile = getImportMapFromFile;
exports.getImportMapFromNodeModules = getImportMapFromNodeModules;

//# sourceMappingURL=main.cjs.map