import { loadOptionsAsync } from "@babel/core";
import { readFile } from "@jsenv/filesystem";
import {
  resolveUrl,
  urlToExtension,
  urlToRelativeUrl,
  urlIsInsideOf,
  urlToFileSystemPath,
} from "@jsenv/urls";
import {
  normalizeImportMap,
  resolveImport,
  composeTwoImportMaps,
} from "@jsenv/importmap";
import { isSpecifierForNodeCoreModule } from "@jsenv/importmap/src/isSpecifierForNodeCoreModule.js";
import {
  memoizeAsyncFunctionByUrl,
  memoizeAsyncFunctionBySpecifierAndImporter,
} from "../memoize_async_function.js";
import { parseSpecifiersFromJs } from "./js_parser.js";
import { parseHTMLRessources } from "./html_parser.js";
import { showSource } from "./show_source.js";
import { resolveFile } from "../resolve_file.js";
import {
  createBareSpecifierAutomappingMessage,
  createExtensionAutomappingMessage,
  createImportResolutionFailedWarning,
} from "../logs.js";

export const visitFiles = async ({
  logger,
  warn,
  projectDirectoryUrl,
  entryPointsToCheck,
  runtime,
  importMap,
  bareSpecifierAutomapping,
  magicExtensions, // = [".js", ".jsx", ".ts", ".tsx", ".node", ".json"],
  removeUnusedMappings,
  babelConfigFileUrl,
}) => {
  const baseUrl =
    runtime === "browser" ? "http://jsenv.com" : projectDirectoryUrl;
  const asFileUrl = (url) =>
    moveUrl({ url, from: baseUrl, to: projectDirectoryUrl });
  const asHttpUrl = (url) =>
    moveUrl({ url, from: projectDirectoryUrl, to: baseUrl });

  const imports = {};
  const scopes = {};
  const addMapping = ({ scope, from, to }) => {
    if (scope) {
      scopes[scope] = {
        ...(scopes[scope] || {}),
        [from]: to,
      };
    } else {
      imports[from] = to;
    }
  };

  const topLevelMappingsUsed = [];
  const scopedMappingsUsed = {};
  const markMappingAsUsed = ({ scope, from, to }) => {
    if (scope) {
      if (scope in scopedMappingsUsed) {
        scopedMappingsUsed[scope].push({ from, to });
      } else {
        scopedMappingsUsed[scope] = [{ from, to }];
      }
    } else {
      topLevelMappingsUsed.push({ from, to });
    }
  };

  const importResolver = createImportResolver({
    logger,
    warn,
    runtime,
    importMap,
    projectDirectoryUrl,
    baseUrl,
    asFileUrl,
    asHttpUrl,
    bareSpecifierAutomapping,
    magicExtensions,
    onImportMapping: ({ scope, from }) => {
      if (scope) {
        // make scope relative again
        scope = `./${urlToRelativeUrl(scope, baseUrl)}`;
      }
      // make from relative again
      if (from.startsWith(baseUrl)) {
        from = `./${urlToRelativeUrl(from, baseUrl)}`;
      }

      markMappingAsUsed({
        scope,
        from,
        to: scope ? importMap.scopes[scope][from] : importMap.imports[from],
      });
    },
    performAutomapping: (automapping) => {
      addMapping(automapping);
      markMappingAsUsed(automapping);
    },
  });

  // https://babeljs.io/docs/en/babel-core#loadoptions
  const babelOptions = babelConfigFileUrl
    ? await loadOptionsAsync({
        configFile: urlToFileSystemPath(babelConfigFileUrl),
      })
    : await loadOptionsAsync({
        root: urlToFileSystemPath(projectDirectoryUrl),
      });

  const visitSpecifier = memoizeAsyncFunctionBySpecifierAndImporter(
    async (specifier, importer, { importTrace }) => {
      const { found, ignore, url, body, contentType } =
        await importResolver.applyImportResolution({
          specifier,
          importer,
          importTrace,
        });

      if (!found || ignore) {
        return;
      }
      if (!visitUrlResponse.isInMemory(url)) {
        await visitUrlResponse(url, { contentType, body });
      }
    },
  );

  const visitUrlResponse = memoizeAsyncFunctionByUrl(
    async (url, { contentType, body }) => {
      if (contentType === "application/javascript") {
        const specifiers = await parseSpecifiersFromJs({
          code: body,
          url,
          babelOptions,
        });
        await Promise.all(
          Object.keys(specifiers).map(async (specifier) => {
            const specifierInfo = specifiers[specifier];
            const importTrace = showSource({
              url: asFileUrl(url) || url,
              line: specifierInfo.line,
              column: specifierInfo.column,
              source: body,
            });
            await visitSpecifier(specifier, url, { importTrace });
          }),
        );
        return;
      }
      if (contentType === "text/html") {
        const htmlRessources = await parseHTMLRessources({
          code: body,
          url,
          asFileUrl,
        });
        await Promise.all(
          htmlRessources.map(async (htmlRessource) => {
            if (htmlRessource.isExternal) {
              return;
            }
            await visitUrlResponse(htmlRessource.url, {
              contentType: htmlRessource.contentType,
              body: htmlRessource.content,
            });
          }),
        );
        return;
      }
    },
  );

  await entryPointsToCheck.reduce(async (previous, entryPointToCheck) => {
    await previous;

    // normalize the entry point specifier
    const entryPointUrl = resolveUrl(entryPointToCheck, baseUrl);
    const entryPointRelativeUrl = urlToRelativeUrl(entryPointUrl, baseUrl);
    const entryPointSpecifier = `./${entryPointRelativeUrl}`;
    await visitSpecifier(entryPointSpecifier, baseUrl, {
      importTrace: "entryPointsToCheck parameter",
    });
  }, Promise.resolve());

  if (removeUnusedMappings) {
    const importsUsed = {};
    topLevelMappingsUsed.forEach(({ from, to }) => {
      importsUsed[from] = to;
    });
    const scopesUsed = {};
    Object.keys(scopedMappingsUsed).forEach((scope) => {
      const mappingsUsed = scopedMappingsUsed[scope];
      const scopedMappings = {};
      mappingsUsed.forEach(({ from, to }) => {
        scopedMappings[from] = to;
      });
      scopesUsed[scope] = scopedMappings;
    });
    return {
      imports: importsUsed,
      scopes: scopesUsed,
    };
  }

  return composeTwoImportMaps(importMap, { imports, scopes });
};

const createImportResolver = ({
  logger,
  warn,
  runtime,
  importMap,
  asFileUrl,
  asHttpUrl,
  baseUrl,
  projectDirectoryUrl,
  bareSpecifierAutomapping,
  magicExtensions,
  onImportMapping,
  performAutomapping,
}) => {
  const importMapNormalized = normalizeImportMap(importMap, baseUrl);
  const BARE_SPECIFIER_ERROR = {};

  const applyImportResolution = async ({
    specifier,
    importer,
    importTrace,
  }) => {
    if (runtime === "node" && isSpecifierForNodeCoreModule(specifier)) {
      return {
        found: true,
        ignore: true,
      };
    }

    let importResolution = resolveImportUrl({
      specifier,
      importer,
    });
    const extensionsToTry = getExtensionsToTry(
      magicExtensions || ["inherit"],
      importer,
    );
    if (importResolution.gotBareSpecifierError) {
      // If a magic extension can avoid the bare specifier error
      // let's use it.
      extensionsToTry.find((extensionToTry) => {
        const resolutionResult = resolveImportUrl({
          specifier: `${specifier}${extensionToTry}`,
          importer,
        });
        if (resolutionResult.gotBareSpecifierError) {
          return false;
        }
        importResolution = resolutionResult;
        return true;
      });
    }

    const importFileUrl = asFileUrl(importResolution.url);
    if (importFileUrl) {
      return handleFileUrl({
        specifier,
        importer,
        importTrace,
        gotBareSpecifierError: importResolution.gotBareSpecifierError,
        importUrl: importFileUrl,
        extensionsToTry,
      });
    }

    if (
      importResolution.url.startsWith("http:") ||
      importResolution.url.startsWith("https:")
    ) {
      return handleHttpUrl();
    }

    return handleFileUrl({
      specifier,
      importer,
      importTrace,
      gotBareSpecifierError: importResolution.gotBareSpecifierError,
      importUrl: importResolution.url,
      extensionsToTry,
    });
  };

  const resolveImportUrl = ({ specifier, importer }) => {
    try {
      const url = resolveImport({
        specifier,
        importer,
        importMap: importMapNormalized,
        defaultExtension: false,
        onImportMapping,
        createBareSpecifierError: () => BARE_SPECIFIER_ERROR,
      });

      return {
        gotBareSpecifierError: false,
        url,
      };
    } catch (e) {
      return {
        gotBareSpecifierError: true,
        url: resolveUrl(specifier, importer),
      };
    }
  };

  const handleHttpUrl = async () => {
    // NICE TO HAVE: perform an http request and check for 404 and things like that
    // the day we do the http request, this function would return both
    // if the file is found and the file content
    // because once http request is done we can await response body
    // CURRENT BEHAVIOUR: consider http url as found without checking
    return {
      found: true,
      ignore: true,
      body: null,
    };
  };

  const foundFileUrl = async (url) => {
    const extension = urlToExtension(url);
    const contentType =
      extension === ".html"
        ? "text/html"
        : [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(extension)
        ? "application/javascript"
        : "application/octet-stream";
    const httpUrl = asHttpUrl(url);

    if (
      contentType === "application/javascript" ||
      contentType === "text/html"
    ) {
      return {
        found: true,
        url: httpUrl || url,
        body: await readFile(url, { as: "string" }),
        contentType,
      };
    }

    return {
      found: true,
      ignore: true,
      url: httpUrl || url,
    };
  };

  const handleFileUrl = async ({
    specifier,
    importer,
    importTrace,
    gotBareSpecifierError,
    importUrl,
    extensionsToTry,
  }) => {
    const { magicExtension, found, url } = await resolveFile(importUrl, {
      magicExtensionEnabled: true,
      extensionsToTry,
    });

    const importerUrl = asFileUrl(importer);
    const importerPackageDirectoryUrl = packageDirectoryUrlFromUrl(
      importerUrl,
      projectDirectoryUrl,
    );
    const scope =
      importerPackageDirectoryUrl === projectDirectoryUrl
        ? undefined
        : `./${urlToRelativeUrl(
            importerPackageDirectoryUrl,
            projectDirectoryUrl,
          )}`;
    const automapping = getAutomapping({
      specifier,
      scope,
      projectDirectoryUrl,
      importerUrl,
      url,
    });
    if (gotBareSpecifierError) {
      if (!found) {
        warn(
          createImportResolutionFailedWarning({
            specifier,
            importTrace,
            gotBareSpecifierError,
            suggestsNodeRuntime:
              runtime !== "node" && isSpecifierForNodeCoreModule(specifier),
          }),
        );
        return { found: false };
      }
      if (!bareSpecifierAutomapping) {
        warn(
          createImportResolutionFailedWarning({
            specifier,
            importTrace,
            gotBareSpecifierError,
            automapping,
          }),
        );
        return { found: false };
      }
      logger.debug(
        createBareSpecifierAutomappingMessage({
          specifier,
          importTrace,
          automapping,
        }),
      );
      performAutomapping(automapping);
      return foundFileUrl(url);
    }
    if (!found) {
      warn(
        createImportResolutionFailedWarning({
          specifier,
          importTrace,
          importUrl,
        }),
      );
      return { found: false };
    }
    if (magicExtension) {
      if (!magicExtensions) {
        const packageDirectoryUrl = packageDirectoryUrlFromUrl(
          url,
          projectDirectoryUrl,
        );
        const packageFileUrl = resolveUrl("package.json", packageDirectoryUrl);
        const mappingFoundInPackageExports =
          await extensionIsMappedInPackageExports(packageFileUrl);
        if (!mappingFoundInPackageExports) {
          warn(
            createImportResolutionFailedWarning({
              specifier,
              importTrace,
              importUrl,
              magicExtension,
              automapping,
            }),
          );
          return { found: false };
        }
        logger.debug(
          createExtensionAutomappingMessage({
            specifier,
            importTrace,
            automapping,
            mappingFoundInPackageExports,
          }),
        );
        performAutomapping(automapping);
        return foundFileUrl(url);
      }
      logger.debug(
        createExtensionAutomappingMessage({
          specifier,
          importTrace,
          automapping,
        }),
      );
      performAutomapping(automapping);
      return foundFileUrl(url);
    }
    return foundFileUrl(url);
  };

  return { applyImportResolution };
};

const getAutomapping = ({
  specifier,
  scope,
  projectDirectoryUrl,
  importerUrl,
  url,
}) => {
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const specifierUrl = resolveUrl(specifier, importerUrl);
    return {
      scope,
      from: `./${urlToRelativeUrl(specifierUrl, projectDirectoryUrl)}`,
      to: `./${urlToRelativeUrl(url, projectDirectoryUrl)}`,
    };
  }

  return {
    scope,
    from: specifier,
    to: `./${urlToRelativeUrl(url, projectDirectoryUrl)}`,
  };
};

const moveUrl = ({ url, from, to }) => {
  if (urlIsInsideOf(url, from)) {
    const relativeUrl = urlToRelativeUrl(url, from);
    return resolveUrl(relativeUrl, to);
  }
  if (url === from) {
    return to;
  }
  return null;
};

const extensionIsMappedInPackageExports = async (packageFileUrl) => {
  try {
    const closestPackageObject = await readFile(packageFileUrl, {
      as: "json",
    });
    // it's imprecise because we are not ensuring the wildcard correspond
    // to the required mapping, but good enough for now
    const containsWildcard = Object.keys(
      closestPackageObject.exports || {},
    ).some((key) => key.includes("*"));
    return containsWildcard;
  } catch (e) {
    if (e.code === "ENOENT") {
      return false;
    }
    throw e;
  }
};

const packageDirectoryUrlFromUrl = (url, projectDirectoryUrl) => {
  const relativeUrl = urlToRelativeUrl(url, projectDirectoryUrl);

  const lastNodeModulesDirectoryStartIndex =
    relativeUrl.lastIndexOf("node_modules/");
  if (lastNodeModulesDirectoryStartIndex === -1) {
    return projectDirectoryUrl;
  }

  const lastNodeModulesDirectoryEndIndex =
    lastNodeModulesDirectoryStartIndex + `node_modules/`.length;

  const beforeNodeModulesLastDirectory = relativeUrl.slice(
    0,
    lastNodeModulesDirectoryEndIndex,
  );
  const afterLastNodeModulesDirectory = relativeUrl.slice(
    lastNodeModulesDirectoryEndIndex,
  );
  const remainingDirectories = afterLastNodeModulesDirectory.split("/");

  if (afterLastNodeModulesDirectory[0] === "@") {
    // scoped package
    const remainingPathToPackageDirectory = remainingDirectories
      .slice(0, 2)
      .join("/");
    return `${projectDirectoryUrl}${beforeNodeModulesLastDirectory}${remainingPathToPackageDirectory}/`;
  }
  return `${projectDirectoryUrl}${beforeNodeModulesLastDirectory}${remainingDirectories[0]}/`;
};

const getExtensionsToTry = (magicExtensions, importer) => {
  const extensionsSet = new Set();
  magicExtensions.forEach((magicExtension) => {
    if (magicExtension === "inherit") {
      const importerExtension = urlToExtension(importer);
      extensionsSet.add(importerExtension);
    } else {
      extensionsSet.add(magicExtension);
    }
  });
  return Array.from(extensionsSet.values());
};
