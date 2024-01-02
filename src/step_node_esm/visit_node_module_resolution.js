import { readFileSync } from "node:fs";
import { createDetailedMessage } from "@jsenv/logger";
import { urlToRelativeUrl, urlToFileSystemPath } from "@jsenv/urls";

import { resolvePackageMain } from "./resolve_package_main.js";
import { visitPackageImportmap } from "./visit_package_importmap.js";
import { visitPackageImports } from "./visit_package_imports.js";
import { visitPackageExports } from "./visit_package_exports.js";
import { createFindNodeModulePackage } from "./node_module_resolution.js";

export const visitNodeModuleResolution = async (
  visitors,
  {
    logger,
    warn,
    rootDirectoryUrl,
    nodeModulesOutsideProjectAllowed,
    packagesManualOverrides,
    exportsFieldWarningConfig,
  },
) => {
  const rootPackageFileUrl = new URL("./package.json", rootDirectoryUrl).href;
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
    return (
      packageFileUrl in seen &&
      seen[packageFileUrl].includes(importerPackageFileUrl)
    );
  };

  const visit = async ({
    packageVisitors,
    packageInfo,
    packageImporterInfo,
    isDevDependency,
  }) => {
    packageVisitors = packageVisitors.filter((visitor) => {
      return (
        !visitor.packageIncludedPredicate ||
        visitor.packageIncludedPredicate(packageInfo, packageImporterInfo)
      );
    });
    if (packageVisitors.length === 0) {
      return;
    }

    await visitDependencies({
      packageVisitors,
      packageInfo,
      isDevDependency,
    });

    await visitPackage({
      packageVisitors,
      packageInfo,
      packageImporterInfo,
      isDevDependency,
    });
  };

  const visitDependencies = async ({
    packageVisitors,
    packageInfo,
    isDevDependency,
  }) => {
    const dependencyMap = packageDependenciesFromPackageObject(
      packageInfo.object,
    );

    await Promise.all(
      Object.keys(dependencyMap).map(async (dependencyName) => {
        const dependencyInfo = dependencyMap[dependencyName];
        if (dependencyInfo.type === "devDependency") {
          if (packageInfo.url !== rootPackageFileUrl) {
            return;
          }
          const visitorsForDevDependencies = packageVisitors.filter(
            (visitor) => {
              return visitor.includeDevDependencies;
            },
          );
          if (visitorsForDevDependencies.length === 0) {
            return;
          }

          await visitDependency({
            packageVisitors: visitorsForDevDependencies,
            packageInfo,
            dependencyName,
            dependencyInfo,
            isDevDependency: true,
          });
          return;
        }

        await visitDependency({
          packageVisitors,
          packageInfo,
          dependencyName,
          dependencyInfo,
          isDevDependency,
        });
      }),
    );
  };

  const visitDependency = async ({
    packageVisitors,
    packageInfo,
    dependencyName,
    dependencyInfo,
    isDevDependency,
  }) => {
    const dependencyData = await findDependency({
      packageFileUrl: packageInfo.url,
      dependencyName,
    });
    if (!dependencyData) {
      const cannotFindPackageWarning = createCannotFindPackageWarning({
        dependencyName,
        dependencyInfo,
        packageInfo,
      });
      if (dependencyInfo.isOptional) {
        logger.debug(cannotFindPackageWarning.message);
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
      packageJsonObject: dependencyPackageJsonObject,
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
        object: dependencyPackageJsonObject,
      },
      packageImporterInfo: packageInfo,
      isDevDependency,
    });
  };

  const visitPackage = async ({
    packageVisitors,
    packageInfo,
    packageImporterInfo,
    isDevDependency,
  }) => {
    const packageDerivedInfo = computePackageDerivedInfo({
      rootDirectoryUrl,
      packageInfo,
      packageImporterInfo,
    });

    const addImportMapForPackage = (visitor, importMap) => {
      if (packageDerivedInfo.packageIsRoot) {
        const { imports = {}, scopes = {} } = importMap;
        Object.keys(imports).forEach((from) => {
          triggerVisitorOnMapping(visitor, {
            from,
            to: imports[from],
          });
        });
        Object.keys(scopes).forEach((scope) => {
          const scopeMappings = scopes[scope];
          Object.keys(scopeMappings).forEach((key) => {
            triggerVisitorOnMapping(visitor, {
              scope,
              from: key,
              to: scopeMappings[key],
            });
          });
        });
        return;
      }

      const { imports = {}, scopes = {} } = importMap;
      const scope = `./${packageDerivedInfo.packageDirectoryRelativeUrl}`;
      Object.keys(imports).forEach((from) => {
        const to = imports[from];
        const toMoved = moveMappingValue(to, packageInfo.url, rootDirectoryUrl);
        triggerVisitorOnMapping(visitor, {
          scope,
          from,
          to: toMoved,
        });
      });
      Object.keys(scopes).forEach((scope) => {
        const scopeMappings = scopes[scope];
        const scopeMoved = moveMappingValue(
          scope,
          packageInfo.url,
          rootDirectoryUrl,
        );
        Object.keys(scopeMappings).forEach((key) => {
          const to = scopeMappings[key];
          const toMoved = moveMappingValue(
            to,
            packageInfo.url,
            rootDirectoryUrl,
          );
          triggerVisitorOnMapping(visitor, {
            scope: scopeMoved,
            from: key,
            to: toMoved,
          });
        });
      });
    };

    const addMappingsForPackageAndImporter = (visitor, mappings) => {
      if (packageDerivedInfo.packageIsRoot) {
        Object.keys(mappings).forEach((from) => {
          const to = mappings[from];
          triggerVisitorOnMapping(visitor, {
            from,
            to,
          });
        });
        return;
      }

      if (packageDerivedInfo.importerIsRoot) {
        // own package mappings available to himself
        Object.keys(mappings).forEach((from) => {
          const to = mappings[from];
          triggerVisitorOnMapping(visitor, {
            scope: `./${packageDerivedInfo.packageDirectoryRelativeUrl}`,
            from,
            to,
          });
          triggerVisitorOnMapping(visitor, { from, to });
        });

        // if importer is root no need to make package mappings available to the importer
        // because they are already on top level mappings
        return;
      }

      Object.keys(mappings).forEach((from) => {
        const to = mappings[from];
        // own package exports available to himself
        triggerVisitorOnMapping(visitor, {
          scope: `./${packageDerivedInfo.packageDirectoryRelativeUrl}`,
          from,
          to,
        });
        // now make package exports available to the importer
        // here if the importer is himself we could do stuff
        // we should even handle the case earlier to prevent top level remapping
        triggerVisitorOnMapping(visitor, {
          scope: `./${packageDerivedInfo.importerRelativeUrl}`,
          from,
          to,
        });
      });
    };

    const importsFromPackageField = await visitPackageImportmap({
      warn,
      packageInfo,
      rootDirectoryUrl,
    });
    packageVisitors.forEach((visitor) => {
      addImportMapForPackage(visitor, importsFromPackageField);
    });

    if ("imports" in packageInfo.object) {
      packageVisitors.forEach((visitor) => {
        const packageImports = visitPackageImports({
          warn,
          packageInfo,
          packageConditions: visitor.packageConditions,
        });

        const mappingsFromPackageImports = {};
        Object.keys(packageImports).forEach((from) => {
          const to = packageImports[from];
          mappingsFromPackageImports[from] = to;
        });
        addImportMapForPackage(visitor, {
          imports: mappingsFromPackageImports,
        });
      });
    }

    if ("exports" in packageInfo.object) {
      packageVisitors.forEach((visitor) => {
        const packageExports = visitPackageExports({
          rootDirectoryUrl,
          warn,
          packageInfo,
          packageConditions: visitor.packageConditions,
        });
        const mappingsFromPackageExports = {};
        Object.keys(packageExports).forEach((from) => {
          const to = packageExports[from];
          if (from.indexOf("*") === -1) {
            mappingsFromPackageExports[from] = to;
            return;
          }

          if (
            from.endsWith("/*") &&
            to.endsWith("/*") &&
            // ensure ends with '*' AND there is only one '*' occurence
            to.indexOf("*") === to.length - 1
          ) {
            const fromWithouTrailingStar = from.slice(0, -1);
            const toWithoutTrailingStar = to.slice(0, -1);
            mappingsFromPackageExports[fromWithouTrailingStar] =
              toWithoutTrailingStar;
            return;
          }

          logger.debug(
            createExportsWildcardIgnoredWarning({
              key: from,
              value: to,
              packageInfo,
            }),
          );
        });
        addMappingsForPackageAndImporter(visitor, mappingsFromPackageExports);
      });
    } else {
      // no "exports" field means any file can be imported
      // -> generate a mapping to allow this
      // https://nodejs.org/docs/latest-v15.x/api/packages.html#packages_name
      const packageDirectoryRelativeUrl = urlToRelativeUrl(
        new URL("./", packageInfo.url).href,
        rootDirectoryUrl,
      );
      packageVisitors.forEach((visitor) => {
        addMappingsForPackageAndImporter(visitor, {
          [`${packageInfo.name}/`]: `./${packageDirectoryRelativeUrl}`,
        });
      });

      // visit "main" only if there is no "exports"
      // https://nodejs.org/docs/latest-v16.x/api/packages.html#packages_main
      await visitPackageMain({
        packageVisitors,
        packageInfo,
        packageDerivedInfo,
        isDevDependency,
      });
    }
  };

  const visitPackageMain = async ({
    packageVisitors,
    packageInfo,
    packageDerivedInfo,
    isDevDependency,
  }) => {
    const {
      packageIsRoot,
      importerIsRoot,
      importerRelativeUrl,
      packageDirectoryUrl,
      packageDirectoryUrlExpected,
    } = packageDerivedInfo;

    for (const visitor of packageVisitors) {
      const exportsFieldSeverity = shouldWarnAboutExportsField({
        exportsFieldWarningConfig,
        isDevDependency,
      })
        ? "warn"
        : "debug";
      const mainResolutionInfo = await resolvePackageMain({
        logger,
        warn,
        exportsFieldSeverity,
        packageInfo,
        packageConditions: visitor.packageConditions,
      });

      if (!mainResolutionInfo.found) {
        const { warning } = mainResolutionInfo;
        // main explicitely disabled
        if (packageInfo.object.main === "") {
          return;
        }

        // main "should" be there but if we warn there is many false positive
        // when package have no main file and that's expected
        if (packageInfo.object.main === undefined) {
          logger.debug(warning.message);
        } else {
          // we don't know yet if the codebase will rely on main file presence or not
          // so when main does not lead to a file:
          // - a warning is logged
          // - we still generate the mapping
          warn(warning);
        }
      }

      const mainFileRelativeUrl = urlToRelativeUrl(
        new URL(mainResolutionInfo.relativeUrl, packageInfo.url),
        rootDirectoryUrl,
      );
      const scope =
        packageIsRoot || importerIsRoot ? null : `./${importerRelativeUrl}`;
      const from = packageInfo.name;
      const to = `./${mainFileRelativeUrl}`;

      triggerVisitorOnMapping(visitor, {
        scope,
        from,
        to,
      });

      if (packageDirectoryUrl !== packageDirectoryUrlExpected) {
        triggerVisitorOnMapping(visitor, {
          scope: `./${importerRelativeUrl}`,
          from,
          to,
        });
      }
    }
  };

  const dependenciesCache = {};
  const findDependency = ({ packageFileUrl, dependencyName }) => {
    if (packageFileUrl in dependenciesCache === false) {
      dependenciesCache[packageFileUrl] = {};
    }
    if (dependencyName in dependenciesCache[packageFileUrl]) {
      return dependenciesCache[packageFileUrl][dependencyName];
    }
    const dependencyPromise = findNodeModulePackage({
      rootDirectoryUrl,
      nodeModulesOutsideProjectAllowed,
      packageFileUrl,
      dependencyName,
      packagesManualOverrides,
    });
    dependenciesCache[packageFileUrl][dependencyName] = dependencyPromise;
    return dependencyPromise;
  };

  let rootPackageObject;
  try {
    rootPackageObject = JSON.parse(
      readFileSync(new URL(rootPackageFileUrl)),
      "utf8",
    );
  } catch (e) {
    if (e.code === "ENOENT") {
      const error = new Error(
        createDetailedMessage(`Cannot find root package.json file.`, {
          "package.json url": rootPackageObject,
        }),
      );
      error.code = "PROJECT_PACKAGE_FILE_NOT_FOUND";
      throw error;
    }
    throw e;
  }

  const importerPackageFileUrl = rootPackageFileUrl;
  markPackageAsSeen(rootPackageFileUrl, importerPackageFileUrl);
  await visit({
    packageInfo: {
      url: rootPackageFileUrl,
      name: rootPackageObject.name,
      object: rootPackageObject,
    },
    packageImporterInfo: null,
    packageVisitors: visitors,
    isDevDependency: false,
  });
};

const triggerVisitorOnMapping = (visitor, { scope, from, to }) => {
  if (scope) {
    // when a package says './' maps to './'
    // we add something to say if we are already inside the package
    // no need to ensure leading slash are scoped to the package
    if (from === "./" && to === scope) {
      triggerVisitorOnMapping(visitor, {
        scope,
        from: scope,
        to: scope,
      });
      const packageName = scope.slice(
        scope.lastIndexOf("node_modules/") + `node_modules/`.length,
      );
      triggerVisitorOnMapping(visitor, {
        scope,
        from: packageName,
        to: scope,
      });
    } else {
      visitor.onMapping({
        scope,
        from,
        to,
      });
    }
    return;
  }

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
  visitor.onMapping({ from, to });
};

const packageDependenciesFromPackageObject = (packageObject) => {
  const packageDependencies = {};

  const { dependencies = {} } = packageObject;
  // https://npm.github.io/using-pkgs-docs/package-json/types/optionaldependencies.html
  const { optionalDependencies = {} } = packageObject;
  Object.keys(dependencies).forEach((dependencyName) => {
    packageDependencies[dependencyName] = {
      type: "dependency",
      isOptional: dependencyName in optionalDependencies,
      versionPattern: dependencies[dependencyName],
    };
  });

  const { peerDependencies = {} } = packageObject;
  const { peerDependenciesMeta = {} } = packageObject;
  Object.keys(peerDependencies).forEach((dependencyName) => {
    packageDependencies[dependencyName] = {
      type: "peerDependency",
      versionPattern: peerDependencies[dependencyName],
      isOptional:
        dependencyName in peerDependenciesMeta &&
        peerDependenciesMeta[dependencyName].optional,
    };
  });

  const { devDependencies = {} } = packageObject;
  Object.keys(devDependencies).forEach((dependencyName) => {
    if (!packageDependencies.hasOwnProperty(dependencyName)) {
      packageDependencies[dependencyName] = {
        type: "devDependency",
        versionPattern: devDependencies[dependencyName],
      };
    }
  });

  return packageDependencies;
};

const moveMappingValue = (address, from, to) => {
  const url = new URL(address, from).href;
  const relativeUrl = urlToRelativeUrl(url, to);
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
  rootDirectoryUrl,
  packageInfo,
  packageImporterInfo,
}) => {
  if (!packageImporterInfo) {
    const packageDirectoryUrl = new URL("./", packageInfo.url).href;
    urlToRelativeUrl(packageDirectoryUrl, rootDirectoryUrl);

    return {
      importerIsRoot: false,
      importerRelativeUrl: "",
      packageIsRoot: true,
      packageDirectoryUrl,
      packageDirectoryUrlExpected: packageDirectoryUrl,
      packageDirectoryRelativeUrl: urlToRelativeUrl(
        packageDirectoryUrl,
        rootDirectoryUrl,
      ),
    };
  }

  const rootPackageFileUrl = new URL("./package.json", rootDirectoryUrl).href;

  const importerIsRoot = packageImporterInfo.url === rootPackageFileUrl;

  const importerPackageDirectoryUrl = new URL("./", packageImporterInfo.url)
    .href;

  const importerRelativeUrl = urlToRelativeUrl(
    importerPackageDirectoryUrl,
    rootDirectoryUrl,
  );

  const packageIsRoot = packageInfo.url === rootPackageFileUrl;

  const packageDirectoryUrl = new URL("./", packageInfo.url).href;

  const packageDirectoryUrlExpected = `${importerPackageDirectoryUrl}node_modules/${packageInfo.name}/`;

  const packageDirectoryRelativeUrl = urlToRelativeUrl(
    packageDirectoryUrl,
    rootDirectoryUrl,
  );

  return {
    importerIsRoot,
    importerRelativeUrl,
    packageIsRoot,
    packageDirectoryUrl,
    packageDirectoryUrlExpected,
    packageDirectoryRelativeUrl,
  };
};

const shouldWarnAboutExportsField = ({
  exportsFieldWarningConfig,
  isDevDependency,
}) => {
  if (!exportsFieldWarningConfig) {
    return false;
  }

  if (isDevDependency) {
    return exportsFieldWarningConfig.devDependencies;
  }

  return exportsFieldWarningConfig.dependencies;
};

const createExportsWildcardIgnoredWarning = ({ key, value, packageInfo }) => {
  return {
    code: "EXPORTS_WILDCARD",
    message: `Ignoring export using "*" because it is not supported by importmap.
--- key ---
${key}
--- value ---
${value}
--- package.json path ---
${urlToFileSystemPath(packageInfo.url)}
--- see also ---
https://github.com/WICG/import-maps/issues/232`,
  };
};

const createCannotFindPackageWarning = ({
  dependencyName,
  dependencyInfo,
  packageInfo,
}) => {
  const dependencyIsOptional = dependencyInfo.isOptional;
  const dependencyType = dependencyInfo.type;
  const dependencyVersionPattern = dependencyInfo.versionPattern;
  return {
    code: "CANNOT_FIND_PACKAGE",
    message: createDetailedMessage(
      dependencyIsOptional
        ? `cannot find an optional ${dependencyType}.`
        : `cannot find a ${dependencyType}.`,
      {
        [dependencyType]: `${dependencyName}@${dependencyVersionPattern}`,
        "required by": urlToFileSystemPath(packageInfo.url),
      },
    ),
  };
};
