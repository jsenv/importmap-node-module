import { createLogger } from "@jsenv/logger";
import {
  assertAndNormalizeDirectoryUrl,
  writeFileSync,
} from "@jsenv/filesystem";
import { urlToFileSystemPath } from "@jsenv/urls";
import {
  composeTwoImportMaps,
  sortImportMap,
  moveImportMap,
} from "@jsenv/importmap";

import { updateJsConfigForVsCode } from "./step_jsconfig/update_js_config_for_vscode.js";
import { testImportmapOnEntryPoints } from "./step_entry_point/test_importmap_on_entry_points.js";
import { optimizeImportmap } from "./util/optimize_importmap.js";

export const writeImportMapFiles = async ({
  logLevel,
  onWarn = (warning, warn) => {
    warn(warning);
  },

  projectDirectoryUrl,
  importMapFiles,
  writeFiles = true,
  packagesManualOverrides,
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

  const importmapRelativeUrls = Object.keys(importMapFiles);
  const importmapCount = importmapRelativeUrls.length;
  if (importmapCount.length) {
    throw new Error(`importMapFiles object is empty`);
  }

  const importmaps = {};
  const importmapOptions = {};

  for (const importmapRelativeUrl of importmapRelativeUrls) {
    const topLevelMappings = {};
    const scopedMappings = {};
    const importmap = {
      imports: topLevelMappings,
      scopes: scopedMappings,
    };
    importmaps[importmapRelativeUrl] = importmap;

    const options = importMapFiles[importmapRelativeUrl];
    importmapOptions[importmapRelativeUrl] = options;
  }

  // manual importmap
  for (const importmapRelativeUrl of importmapRelativeUrls) {
    const options = importmapOptions[importmapRelativeUrl];
    const { manualImportMap } = options;
    if (!manualImportMap) {
      continue;
    }
    assertManualImportMap(manualImportMap);
    const importmap = importmaps[importmapRelativeUrl];
    const importmapAugmentedWithManualOne = composeTwoImportMaps(
      importmap,
      manualImportMap,
    );
    importmaps[importmapRelativeUrl] = importmapAugmentedWithManualOne;
  }

  // entry point(s)
  // - test importmap on files starting from an entry point
  // - generate mapping for extentionless imports
  // - remove unused mappings
  for (const importmapRelativeUrl of importmapRelativeUrls) {
    const options = importmapOptions[importmapRelativeUrl];
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
    } = options;
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
    if (!entryPointsToCheck) {
      continue;
    }
    const importmap = importmaps[importmapRelativeUrl];
    const importmapAfterEntryPointStep = await testImportmapOnEntryPoints(
      importmap,
      {
        logger,
        warn,
        projectDirectoryUrl,
        entryPointsToCheck,
        bareSpecifierAutomapping,
        magicExtensions,
        removeUnusedMappings,
        runtime,
        babelConfigFileUrl,
      },
    );
    importmaps[importmapRelativeUrl] = importmapAfterEntryPointStep;
  }

  updateJsConfigForVsCode(importMapFiles, {
    logger,
    projectDirectoryUrl,
    jsConfigFileUrl,
    jsConfigDefault,
  });

  for (const importmapRelativeUrl of importmapRelativeUrls) {
    let importmap = importmaps[importmapRelativeUrl];
    importmap = optimizeImportmap(importmap);
    const importmapFileUrl = new URL(importmapRelativeUrl, projectDirectoryUrl)
      .href;
    importmap = moveImportMap(importmap, projectDirectoryUrl, importmapFileUrl);
    importmap = sortImportMap(importmap);
    importmaps[importmapRelativeUrl] = importmap;
  }

  if (writeFiles) {
    for (const importmapRelativeUrl of importmapRelativeUrls) {
      const importmapUrl = new URL(importmapRelativeUrl, projectDirectoryUrl);
      const importmap = importmaps[importmapRelativeUrl];
      writeFileSync(importmapUrl, JSON.stringify(importmap, null, "  "));
      logger.info(`-> ${urlToFileSystemPath(importmapUrl)}`);
    }
  }

  return importmaps;
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

const assertManualImportMap = (value) => {
  if (value === null) {
    throw new TypeError(`manualImportMap must be an object, got null`);
  }

  const type = typeof value;
  if (type !== "object") {
    throw new TypeError(`manualImportMap must be an object, received ${value}`);
  }

  const { imports = {}, scopes = {}, ...rest } = value;
  const extraKeys = Object.keys(rest);
  if (extraKeys.length > 0) {
    throw new TypeError(
      `manualImportMap can have "imports" and "scopes", found unexpected keys: "${extraKeys}"`,
    );
  }

  if (typeof imports !== "object") {
    throw new TypeError(
      `manualImportMap.imports must be an object, found ${imports}`,
    );
  }

  if (typeof scopes !== "object") {
    throw new TypeError(
      `manualImportMap.scopes must be an object, found ${imports}`,
    );
  }
};

const jsConfigDefault = {
  compilerOptions: {
    baseUrl: ".",
    paths: {},
  },
};
