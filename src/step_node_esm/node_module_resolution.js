import { readFile, ensureWindowsDriveLetter } from "@jsenv/filesystem";
import {
  urlToRelativeUrl,
  resolveUrl,
  urlToParentUrl,
  urlToFileSystemPath,
} from "@jsenv/urls";

import { memoizeAsyncFunctionByUrl } from "../util/memoize_async_function.js";
import { findAsync } from "../util/find_async.js";

export const createFindNodeModulePackage = () => {
  const readPackageFileMemoized = memoizeAsyncFunctionByUrl(
    (packageFileUrl) => {
      return readPackageFile(packageFileUrl);
    },
  );
  return ({
    rootDirectoryUrl,
    nodeModulesOutsideProjectAllowed,
    packagesManualOverrides = {},
    packageFileUrl,
    dependencyName,
  }) => {
    const nodeModuleCandidates = [
      ...getNodeModuleCandidatesInsideProject({
        rootDirectoryUrl,
        packageFileUrl,
      }),
      ...(nodeModulesOutsideProjectAllowed
        ? getNodeModuleCandidatesOutsideProject({
            rootDirectoryUrl,
          })
        : []),
    ];
    return findAsync({
      array: nodeModuleCandidates,
      start: async (nodeModuleCandidate) => {
        const packageFileUrlCandidate = `${nodeModuleCandidate}${dependencyName}/package.json`;
        const packageObjectCandidate = await readPackageFileMemoized(
          packageFileUrlCandidate,
        );
        return {
          packageFileUrl: packageFileUrlCandidate,
          packageJsonObject: applyPackageManualOverride(
            packageObjectCandidate,
            packagesManualOverrides,
          ),
          syntaxError: packageObjectCandidate === PACKAGE_WITH_SYNTAX_ERROR,
        };
      },
      predicate: ({ packageJsonObject }) => {
        return packageJsonObject !== PACKAGE_NOT_FOUND;
      },
    });
  };
};

const getNodeModuleCandidatesInsideProject = ({
  projectDirectoryUrl,
  packageFileUrl,
}) => {
  const packageDirectoryUrl = resolveUrl("./", packageFileUrl);
  if (packageDirectoryUrl === projectDirectoryUrl) {
    return [`${projectDirectoryUrl}node_modules/`];
  }
  const packageDirectoryRelativeUrl = urlToRelativeUrl(
    packageDirectoryUrl,
    projectDirectoryUrl,
  );
  const candidates = [];
  const relativeNodeModuleDirectoryArray =
    packageDirectoryRelativeUrl.split("node_modules/");
  // remove the first empty string
  relativeNodeModuleDirectoryArray.shift();
  let i = relativeNodeModuleDirectoryArray.length;
  while (i--) {
    candidates.push(
      `${projectDirectoryUrl}node_modules/${relativeNodeModuleDirectoryArray
        .slice(0, i + 1)
        .join("node_modules/")}node_modules/`,
    );
  }
  return [...candidates, `${projectDirectoryUrl}node_modules/`];
};

const getNodeModuleCandidatesOutsideProject = ({ rootDirectoryUrl }) => {
  const candidates = [];
  const parentDirectoryUrl = urlToParentUrl(rootDirectoryUrl);
  const { pathname } = new URL(parentDirectoryUrl);
  const directories = pathname.slice(1, -1).split("/");
  let i = directories.length;
  while (i--) {
    const nodeModulesDirectoryUrl = ensureWindowsDriveLetter(
      `file:///${directories.slice(0, i + 1).join("/")}/node_modules/`,
      rootDirectoryUrl,
    );
    candidates.push(nodeModulesDirectoryUrl);
  }
  return [
    ...candidates,
    ensureWindowsDriveLetter(`file:///node_modules`, rootDirectoryUrl),
  ];
};

const applyPackageManualOverride = (packageObject, packagesManualOverrides) => {
  const { name, version } = packageObject;
  const overrideKey = Object.keys(packagesManualOverrides).find(
    (overrideKeyCandidate) => {
      if (name === overrideKeyCandidate) {
        return true;
      }
      if (`${name}@${version}` === overrideKeyCandidate) {
        return true;
      }
      return false;
    },
  );
  if (overrideKey) {
    return composeObject(packageObject, packagesManualOverrides[overrideKey]);
  }
  return packageObject;
};

const composeObject = (leftObject, rightObject) => {
  const composedObject = {
    ...leftObject,
  };
  Object.keys(rightObject).forEach((key) => {
    const rightValue = rightObject[key];

    if (
      rightValue === null ||
      typeof rightValue !== "object" ||
      key in leftObject === false
    ) {
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

const readPackageFile = async (packageFileUrl) => {
  try {
    const packageObject = await readFile(packageFileUrl, { as: "json" });
    return packageObject;
  } catch (e) {
    if (e.code === "ENOENT") {
      return PACKAGE_NOT_FOUND;
    }

    if (e.name === "SyntaxError") {
      console.error(
        formatPackageSyntaxErrorLog({ syntaxError: e, packageFileUrl }),
      );
      return PACKAGE_WITH_SYNTAX_ERROR;
    }

    throw e;
  }
};

const formatPackageSyntaxErrorLog = ({ syntaxError, packageFileUrl }) => {
  return `error while parsing package.json.
--- syntax error message ---
${syntaxError.message}
--- package.json path ---
${urlToFileSystemPath(packageFileUrl)}
`;
};
