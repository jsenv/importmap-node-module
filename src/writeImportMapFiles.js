import { createLogger } from "@jsenv/logger";
import {
  assertAndNormalizeDirectoryUrl,
  writeFile,
  readFile,
} from "@jsenv/filesystem";
import { resolveUrl, urlToFileSystemPath } from "@jsenv/urls";
import {
  composeTwoImportMaps,
  sortImportMap,
  moveImportMap,
} from "@jsenv/importmap";

import { assertManualImportMap } from "./internal/manual_importmap.js";
import { packageConditionsFromPackageUserConditions } from "./internal/package_conditions.js";
import { visitNodeModuleResolution } from "./internal/from_package/visitNodeModuleResolution.js";
import { visitSourceFiles } from "./internal/from_source/visitSourceFiles.js";
import { optimizeImportMap } from "./internal/optimizeImportMap.js";
import { importMapToVsCodeConfigPaths } from "./internal/importMapToVsCodeConfigPaths.js";

export const writeImportMapFiles = async ({
  logLevel,
  projectDirectoryUrl,
  importMapFiles,
  packagesManualOverrides,
  onWarn = (warning, warn) => {
    warn(warning);
  },
  writeFiles = true,
  exportsFieldWarningConfig,
  babelConfigFileUrl,
  // for unit test
  jsConfigFileUrl,
}) => {
  const logger = createLogger({ logLevel });
  const warn = wrapWarnToWarnOnce((warning) => {
    onWarn(warning, () => {
      logger.warn(`\n${warning.message}\n`);
    });
  });

  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl);

  if (typeof importMapFiles !== "object" || importMapFiles === null) {
    throw new TypeError(
      `importMapFiles must be an object, received ${importMapFiles}`,
    );
  }
  const importMapFileRelativeUrls = Object.keys(importMapFiles);
  const importMapFileCount = importMapFileRelativeUrls.length;
  if (importMapFileCount.length) {
    throw new Error(`importMapFiles object is empty`);
  }

  const importMaps = {};
  const nodeResolutionVisitors = [];
  importMapFileRelativeUrls.forEach((importMapFileRelativeUrl) => {
    const importMapConfig = importMapFiles[importMapFileRelativeUrl];

    const topLevelMappings = {};
    const scopedMappings = {};
    const importMap = {
      imports: topLevelMappings,
      scopes: scopedMappings,
    };
    importMaps[importMapFileRelativeUrl] = importMap;

    const {
      mappingsForNodeResolution,
      mappingsForDevDependencies,
      packageUserConditions,
      packageIncludedPredicate,
      runtime = "browser",
    } = importMapConfig;
    if (mappingsForNodeResolution) {
      const mappingsToPutTopLevel = {};
      nodeResolutionVisitors.push({
        mappingsForDevDependencies,
        runtime,
        packageConditions: packageConditionsFromPackageUserConditions({
          runtime,
          packageUserConditions,
        }),
        packageIncludedPredicate,
        onMapping: ({ scope, from, to }) => {
          if (scope) {
            scopedMappings[scope] = {
              ...(scopedMappings[scope] || {}),
              [from]: to,
            };

            mappingsToPutTopLevel[from] = to;
          } else {
            topLevelMappings[from] = to;
          }
        },
        onVisitDone: () => {
          Object.keys(mappingsToPutTopLevel).forEach((key) => {
            if (!topLevelMappings[key]) {
              topLevelMappings[key] = mappingsToPutTopLevel[key];
            }
          });
        },
      });
    }
  });

  if (nodeResolutionVisitors.length > 0) {
    const nodeModulesOutsideProjectAllowed = nodeResolutionVisitors.every(
      (visitor) => visitor.runtime === "node",
    );
    await visitNodeModuleResolution({
      logger,
      warn,
      projectDirectoryUrl,
      nodeModulesOutsideProjectAllowed,
      visitors: nodeResolutionVisitors,
      packagesManualOverrides,
      exportsFieldWarningConfig,
    });
    nodeResolutionVisitors.forEach((visitor) => visitor.onVisitDone());
  }

  // manual importmap
  importMapFileRelativeUrls.forEach((importMapFileRelativeUrl) => {
    const importMapConfig = importMapFiles[importMapFileRelativeUrl];
    const { manualImportMap } = importMapConfig;
    if (manualImportMap) {
      assertManualImportMap(manualImportMap);
      const importMap = importMaps[importMapFileRelativeUrl];
      const importMapModified = composeTwoImportMaps(
        importMap,
        manualImportMap,
      );
      importMaps[importMapFileRelativeUrl] = importMapModified;
    }
  });

  await importMapFileRelativeUrls.reduce(
    async (previous, importMapFileRelativeUrl) => {
      await previous;
      const importMapConfig = importMapFiles[importMapFileRelativeUrl];
      const {
        // we could deduce it from the package.json but:
        // 1. project might not use package.json
        // 2. it's a bit magic
        // 3. it's kinda possible to assume an export from "exports" field is the main entry point
        //    but for project with many entry points they cannot be distinguised from
        //    "subpath exports" https://nodejs.org/api/packages.html#subpath-exports
        entryPointsToCheck,
        // ideally we could enable magicExtensions and bareSpecifierAutomapping only for a subset
        // of files. Not that hard to do, especially using @jsenv/url-meta
        // but that's super extra fine tuning that I don't have time/energy to do for now
        bareSpecifierAutomapping,
        magicExtensions,
        removeUnusedMappings,
        runtime = "browser",
      } = importMapConfig;

      if (removeUnusedMappings && !entryPointsToCheck) {
        logger.warn(
          `"entryPointsToCheck" is required when "removeUnusedMappings" is enabled`,
        );
      }
      if (magicExtensions && !entryPointsToCheck) {
        logger.warn(
          `"entryPointsToCheck" is required when "magicExtensions" is enabled`,
        );
      }

      if (entryPointsToCheck) {
        const importMap = await visitSourceFiles({
          logger,
          warn,
          projectDirectoryUrl,
          entryPointsToCheck,
          importMap: importMaps[importMapFileRelativeUrl],
          bareSpecifierAutomapping,
          magicExtensions,
          removeUnusedMappings,
          runtime,
          babelConfigFileUrl,
        });
        importMaps[importMapFileRelativeUrl] = importMap;
      }
    },
    Promise.resolve(),
  );

  const firstUpdatingJsConfig = importMapFileRelativeUrls.find(
    (importMapFileRelativeUrl) => {
      const importMapFileConfig = importMapFiles[importMapFileRelativeUrl];
      return importMapFileConfig.useForJsConfigJSON;
    },
  );
  if (firstUpdatingJsConfig) {
    jsConfigFileUrl =
      jsConfigFileUrl || resolveUrl("./jsconfig.json", projectDirectoryUrl);
    const jsConfigCurrent = (await readCurrentJsConfig(jsConfigFileUrl)) || {
      compilerOptions: {},
    };
    const importMapUsedForVsCode = importMaps[firstUpdatingJsConfig];
    const jsConfigPaths = importMapToVsCodeConfigPaths(importMapUsedForVsCode);
    const jsConfig = {
      ...jsConfigDefault,
      ...jsConfigCurrent,
      compilerOptions: {
        ...jsConfigDefault.compilerOptions,
        ...jsConfigCurrent.compilerOptions,
        // importmap is the source of truth -> paths are overwritten
        // We coudldn't differentiate which one we created and which one where added manually anyway
        paths: jsConfigPaths,
      },
    };
    await writeFile(jsConfigFileUrl, JSON.stringify(jsConfig, null, "  "));
    logger.info(`-> ${urlToFileSystemPath(jsConfigFileUrl)}`);
  }

  Object.keys(importMaps).forEach((key) => {
    let importMap = importMaps[key];
    importMap = optimizeImportMap(importMap);
    const importmapFileUrl = resolveUrl(key, projectDirectoryUrl);
    importMap = moveImportMap(importMap, projectDirectoryUrl, importmapFileUrl);
    importMap = sortImportMap(importMap);
    importMaps[key] = importMap;
  });

  if (writeFiles) {
    await importMapFileRelativeUrls.reduce(
      async (previous, importMapFileRelativeUrl) => {
        await previous;
        const importmapFileUrl = resolveUrl(
          importMapFileRelativeUrl,
          projectDirectoryUrl,
        );
        const importMap = importMaps[importMapFileRelativeUrl];
        await writeFile(
          importmapFileUrl,
          JSON.stringify(importMap, null, "  "),
        );
        logger.info(`-> ${urlToFileSystemPath(importmapFileUrl)}`);
      },
      Promise.resolve(),
    );
  }

  return importMaps;
};

const wrapWarnToWarnOnce = (warn) => {
  const warnings = [];
  return (warning) => {
    const alreadyWarned = warnings.some((warningCandidate) => {
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
    paths: {},
  },
};

const readCurrentJsConfig = async (jsConfigFileUrl) => {
  try {
    const currentJSConfig = await readFile(jsConfigFileUrl, { as: "json" });
    return currentJSConfig;
  } catch (e) {
    return null;
  }
};
