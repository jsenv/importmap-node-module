import { createLogger } from "@jsenv/logger";
import {
  assertAndNormalizeDirectoryUrl,
  writeFileSync,
  readFileSync,
} from "@jsenv/filesystem";
import { urlToFileSystemPath } from "@jsenv/urls";
import {
  composeTwoImportMaps,
  sortImportMap,
  moveImportMap,
} from "@jsenv/importmap";

import { assertManualImportMap } from "./internal/manual_importmap.js";
import { packageConditionsFromPackageUserConditions } from "./internal/package_conditions.js";
import { visitNodeModuleResolution } from "./internal/from_package/visit_node_module_resolution.js";
import { visitFiles } from "./internal/from_files/visit_file.js";
import { optimizeImportmap } from "./internal/optimize_importmap.js";
import { importmapToVsCodeConfigPaths } from "./internal/importmap_to_vscode_config_paths.js";

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
  for (const importMapFileRelativeUrl of importMapFileRelativeUrls) {
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
  }

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
    for (const nodeResolutionVisitor of nodeResolutionVisitors) {
      nodeResolutionVisitor.onVisitDone();
    }
  }

  // manual importmap
  for (const importMapFileRelativeUrl of importMapFileRelativeUrls) {
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
  }

  for (const importMapFileRelativeUrl of importMapFileRelativeUrls) {
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
      const importMap = await visitFiles({
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
  }

  const firstUpdatingJsConfig = importMapFileRelativeUrls.find(
    (importMapFileRelativeUrl) => {
      const importMapFileConfig = importMapFiles[importMapFileRelativeUrl];
      return importMapFileConfig.useForJsConfigJSON;
    },
  );
  if (firstUpdatingJsConfig) {
    jsConfigFileUrl =
      jsConfigFileUrl || new URL("./jsconfig.json", projectDirectoryUrl);
    let jsConfigCurrent;
    try {
      jsConfigCurrent = readFileSync(jsConfigFileUrl, { as: "json" });
    } catch (e) {
      jsConfigCurrent = null;
    }
    jsConfigCurrent = jsConfigCurrent || { compilerOptions: {} };

    const importMapUsedForVsCode = importMaps[firstUpdatingJsConfig];
    const jsConfigPaths = importmapToVsCodeConfigPaths(importMapUsedForVsCode);
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
    writeFileSync(jsConfigFileUrl, JSON.stringify(jsConfig, null, "  "));
    logger.info(`-> ${urlToFileSystemPath(jsConfigFileUrl)}`);
  }

  for (const key of Object.keys(importMaps)) {
    let importMap = importMaps[key];
    importMap = optimizeImportmap(importMap);
    const importmapFileUrl = new URL(key, projectDirectoryUrl).href;
    importMap = moveImportMap(importMap, projectDirectoryUrl, importmapFileUrl);
    importMap = sortImportMap(importMap);
    importMaps[key] = importMap;
  }

  if (writeFiles) {
    for (const importMapFileRelativeUrl of importMapFileRelativeUrls) {
      const importmapFileUrl = new URL(
        importMapFileRelativeUrl,
        projectDirectoryUrl,
      ).href;
      const importMap = importMaps[importMapFileRelativeUrl];
      writeFileSync(importmapFileUrl, JSON.stringify(importMap, null, "  "));
      logger.info(`-> ${urlToFileSystemPath(importmapFileUrl)}`);
    }
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
