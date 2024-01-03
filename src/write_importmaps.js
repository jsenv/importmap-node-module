import { createLogger } from "@jsenv/logger";
import { assertAndNormalizeDirectoryUrl } from "@jsenv/filesystem";
import {
  composeTwoImportMaps,
  sortImportMap,
  moveImportMap,
} from "@jsenv/importmap";

import { generateImportmapForNodeESMResolution } from "./step_node_esm/importmap_for_node_esm.js";
import { testImportmapOnEntryPoints } from "./step_entry_point/test_importmap_on_entry_points.js";
import { updateJsConfigForVsCode } from "./step_jsconfig/update_js_config_for_vscode.js";
import { writeIntoFiles } from "./step_write_into_files/write_into_files.js";

const import_resolution_default = {
  // we could deduce it from the package.json but:
  // 1. project might not use package.json
  // 2. it's a bit magic
  // 3. it's kinda possible to assume an export from "exports" field is the main entry point
  //    but for project with many entry points they cannot be distinguised from
  //    "subpath exports" https://nodejs.org/api/packages.html#subpath-exports
  entryPoints: undefined,
  // ideally we could enable magicExtensions and bareSpecifierAutomapping only for a subset
  // of files. Not that hard to do, especially using @jsenv/url-meta
  // but that's super extra fine tuning that I don't have time/energy to do for now
  bareSpecifierAutomapping: false,
  magicExtensions: [],
  keepUnusedMappings: false,
  runtime: "browser",
};

export const writeImportmaps = async ({
  logLevel,
  onWarn = (warning, warn) => {
    warn(warning);
  },

  directoryUrl,
  importmaps,
  writeFiles = true,
  packagesManualOverrides,
  exportsFieldWarningConfig,
  babelConfigFileUrl,
  // for unit test
  jsConfigFileUrl,
  ...rest
}) => {
  const unexpectedParamNames = Object.keys(rest);
  if (unexpectedParamNames.length > 0) {
    throw new TypeError(
      `${unexpectedParamNames.join(",")}: there is no such param`,
    );
  }

  const logger = createLogger({ logLevel });
  const warn = wrapWarnToWarnOnce((warning) => {
    onWarn(warning, () => {
      logger.warn(`\n${warning.message}\n`);
    });
  });

  const rootDirectoryUrl = assertAndNormalizeDirectoryUrl(directoryUrl);

  if (typeof importmaps !== "object" || importmaps === null) {
    throw new TypeError(`importmaps must be an object, received ${importmaps}`);
  }

  const importmapRelativeUrls = Object.keys(importmaps);
  const importmapCount = importmapRelativeUrls.length;
  if (importmapCount.length) {
    throw new Error(`importmaps object is empty`);
  }

  // prepare importmapInfos
  const importmapInfos = {};
  for (const importmapRelativeUrl of importmapRelativeUrls) {
    const options = importmaps[importmapRelativeUrl];
    const topLevelMappings = {};
    const scopedMappings = {};
    const importmap = {
      imports: topLevelMappings,
      scopes: scopedMappings,
    };
    importmapInfos[importmapRelativeUrl] = {
      options,
      importmap,
    };
  }

  // generate importmap for node esm (if enabled)
  await generateImportmapForNodeESMResolution(importmapInfos, {
    logger,
    warn,
    rootDirectoryUrl,
    packagesManualOverrides,
    exportsFieldWarningConfig,
    onImportmapGenerated: (importmap, importmapRelativeUrl) => {
      importmapInfos[importmapRelativeUrl].importmap = importmap;
    },
  });

  // augment with manual importmap (if specified)
  for (const importmapRelativeUrl of importmapRelativeUrls) {
    const importmapInfo = importmapInfos[importmapRelativeUrl];
    const { manualImportmap } = importmapInfo.options;
    if (!manualImportmap) {
      continue;
    }
    assertmanualImportmap(manualImportmap);
    const importmapAugmentedWithManualOne = composeTwoImportMaps(
      importmapInfo.importmap,
      manualImportmap,
    );
    importmapInfo.importmap = importmapAugmentedWithManualOne;
  }

  // entry point(s)
  // - test importmap on files starting from an entry point
  // - generate mapping for extentionless imports
  // - remove unused mappings
  for (const importmapRelativeUrl of importmapRelativeUrls) {
    const importmapInfo = importmapInfos[importmapRelativeUrl];
    let { import_resolution = {} } = importmapInfo.options;
    if (!import_resolution) {
      continue;
    }
    if (typeof import_resolution !== "object") {
      throw new TypeError(
        `import_resolution must be an object, got ${import_resolution}`,
      );
    }

    const unexpectedKeys = Object.keys(import_resolution).filter(
      (key) => !Object.hasOwn(import_resolution_default, key),
    );
    if (unexpectedKeys.length > 0) {
      throw new TypeError(
        `${unexpectedKeys.join(",")}: no such key on "import_resolution"`,
      );
    }
    import_resolution = { ...import_resolution_default, ...import_resolution };
    const {
      entryPoints = [],
      bareSpecifierAutomapping,
      magicExtensions,
      keepUnusedMappings,
      runtime,
    } = import_resolution;

    if (
      !entryPoints.includes(importmapRelativeUrl) &&
      importmapRelativeUrl.endsWith(".html")
    ) {
      entryPoints.push(importmapRelativeUrl);
    }

    if (bareSpecifierAutomapping && entryPoints.length === 0) {
      logger.warn(`"bareSpecifierAutomapping" requires "entryPoints"`);
    }
    if (magicExtensions && entryPoints.length === 0) {
      logger.warn(`"magicExtensions" requires "entryPoints"`);
    }
    if (entryPoints.length === 0) {
      continue;
    }
    const importmapAfterEntryPointStep = await testImportmapOnEntryPoints(
      importmapInfo.importmap,
      {
        logger,
        warn,
        rootDirectoryUrl,
        entryPoints,
        bareSpecifierAutomapping,
        magicExtensions,
        keepUnusedMappings,
        runtime,
        babelConfigFileUrl,
      },
    );
    importmapInfo.importmap = importmapAfterEntryPointStep;
  }

  updateJsConfigForVsCode(importmapInfos, {
    logger,
    rootDirectoryUrl,
    jsConfigFileUrl,
    jsConfigDefault,
  });

  for (const importmapRelativeUrl of importmapRelativeUrls) {
    const importmapInfo = importmapInfos[importmapRelativeUrl];
    let importmap = importmapInfo.importmap;
    importmap = optimizeImportmap(importmap);
    const importmapFileUrl = new URL(importmapRelativeUrl, rootDirectoryUrl)
      .href;
    importmap = moveImportMap(importmap, rootDirectoryUrl, importmapFileUrl);
    importmap = sortImportMap(importmap);
    importmapInfo.importmap = importmap;
  }

  if (writeFiles) {
    writeIntoFiles(importmapInfos, { logger, rootDirectoryUrl });
  }

  const importmapContents = {};
  for (const importmapRelativeUrl of importmapRelativeUrls) {
    importmapContents[importmapRelativeUrl] =
      importmapInfos[importmapRelativeUrl].importmap;
  }
  return importmapContents;
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

const assertmanualImportmap = (value) => {
  if (value === null) {
    throw new TypeError(`manualImportmap must be an object, got null`);
  }

  const type = typeof value;
  if (type !== "object") {
    throw new TypeError(`manualImportmap must be an object, received ${value}`);
  }

  const { imports = {}, scopes = {}, ...rest } = value;
  const extraKeys = Object.keys(rest);
  if (extraKeys.length > 0) {
    throw new TypeError(
      `manualImportmap can have "imports" and "scopes", found unexpected keys: "${extraKeys}"`,
    );
  }

  if (typeof imports !== "object") {
    throw new TypeError(
      `manualImportmap.imports must be an object, found ${imports}`,
    );
  }

  if (typeof scopes !== "object") {
    throw new TypeError(
      `manualImportmap.scopes must be an object, found ${imports}`,
    );
  }
};

const jsConfigDefault = {
  compilerOptions: {
    baseUrl: ".",
    paths: {},
  },
};

const optimizeImportmap = ({ imports, scopes }) => {
  // remove useless duplicates (scoped key+value already defined on imports)
  const scopesOptimized = {};
  Object.keys(scopes).forEach((scope) => {
    const scopeMappings = scopes[scope];
    const scopeMappingsOptimized = {};
    Object.keys(scopeMappings).forEach((mappingKey) => {
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
  return { imports, scopes: scopesOptimized };
};
