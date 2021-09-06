import {
  resolveUrl,
  readFile,
  urlToExtension,
  urlToRelativeUrl,
} from "@jsenv/filesystem"
import {
  normalizeImportMap,
  resolveImport,
  composeTwoImportMaps,
} from "@jsenv/importmap"
import { isSpecifierForNodeCoreModule } from "@jsenv/importmap/src/isSpecifierForNodeCoreModule.js"

import {
  memoizeAsyncFunctionByUrl,
  memoizeAsyncFunctionBySpecifierAndImporter,
} from "../memoizeAsyncFunction.js"

import { parseSpecifiersFromFile } from "./parseSpecifiersFromFile.js"
import { showSource } from "./showSource.js"
import { resolveFile } from "../resolveFile.js"
import {
  createBareSpecifierAutomappingMessage,
  createExtensionLessAutomappingMessage,
  createImportResolutionFailedWarning,
} from "../logs.js"

const BARE_SPECIFIER_ERROR = {}

export const visitSourceFiles = async ({
  logger,
  warn,
  projectDirectoryUrl,
  projectMainFile,
  jsFilesParsingOptions = {},
  runtime,
  importMap,
  bareSpecifierAutomapping,
  extensionlessAutomapping,
  magicExtensions, //  = [".js", ".jsx", ".ts", ".tsx", ".node", ".json"],
  removeUnusedMappings,
}) => {
  const imports = {}
  const scopes = {}
  const addMapping = ({ scope, from, to }) => {
    if (scope) {
      scopes[scope] = {
        ...(scopes[scope] || {}),
        [from]: to,
      }
    } else {
      imports[from] = to
    }
  }

  const topLevelMappingsUsed = []
  const scopedMappingsUsed = {}
  const markMappingAsUsed = ({ scope, from, to }) => {
    if (scope) {
      if (scope in scopedMappingsUsed) {
        scopedMappingsUsed[scope].push({ from, to })
      } else {
        scopedMappingsUsed[scope] = [{ from, to }]
      }
    } else {
      topLevelMappingsUsed.push({ from, to })
    }
  }
  const importMapNormalized = normalizeImportMap(importMap, projectDirectoryUrl)
  const trackAndResolveImport = (specifier, importer) => {
    return resolveImport({
      specifier,
      importer,
      importMap: importMapNormalized,
      defaultExtension: false,
      onImportMapping: ({ scope, from }) => {
        if (scope) {
          // make scope relative again
          scope = `./${urlToRelativeUrl(scope, projectDirectoryUrl)}`
          // make from relative again
          if (from.startsWith(projectDirectoryUrl)) {
            from = `./${urlToRelativeUrl(from, projectDirectoryUrl)}`
          }
        }

        markMappingAsUsed({
          scope,
          from,
          to: scope ? importMap.scopes[scope][from] : importMap.imports[from],
        })
      },
      createBareSpecifierError: () => BARE_SPECIFIER_ERROR,
    })
  }

  const testImportResolution = memoizeAsyncFunctionBySpecifierAndImporter(
    async (specifier, importer, { importedBy }) => {
      const url = await tryToResolveImport({
        logger,
        warn,
        specifier,
        importer,
        importedBy,
        projectDirectoryUrl,
        trackAndResolveImport,
        runtime,
        bareSpecifierAutomapping,
        extensionlessAutomapping,
        magicExtensions,
        performAutomapping: (automapping) => {
          addMapping(automapping)
          markMappingAsUsed(automapping)
        },
      })

      return url
    },
  )

  const visitImport = memoizeAsyncFunctionByUrl(async (fileUrl) => {
    const fileContent = await readFile(fileUrl, { as: "string" })
    const specifiers = await parseSpecifiersFromFile(fileUrl, {
      fileContent,
      jsFilesParsingOptions,
    })

    const dependencies = await Promise.all(
      Object.keys(specifiers).map(async (specifier) => {
        const specifierInfo = specifiers[specifier]
        const dependencyUrlOnFileSystem = await testImportResolution(
          specifier,
          fileUrl,
          {
            importedBy: showSource({
              url: fileUrl,
              line: specifierInfo.line,
              column: specifierInfo.column,
              source: fileContent,
            }),
          },
        )
        return dependencyUrlOnFileSystem
      }),
    )
    const dependenciesToVisit = dependencies.filter((dependency) => {
      return dependency && !visitImport.isInMemory(dependency)
    })
    await Promise.all(
      dependenciesToVisit.map((dependency) => {
        return visitImport(dependency)
      }),
    )
  })

  await visitImport(projectMainFile)

  if (removeUnusedMappings) {
    const importsUsed = {}
    topLevelMappingsUsed.forEach(({ from, to }) => {
      importsUsed[from] = to
    })
    const scopesUsed = {}
    Object.keys(scopedMappingsUsed).forEach((scope) => {
      const mappingsUsed = scopedMappingsUsed[scope]
      const scopedMappings = {}
      mappingsUsed.forEach(({ from, to }) => {
        scopedMappings[from] = to
      })
      scopesUsed[scope] = scopedMappings
    })
    return {
      imports: importsUsed,
      scopes: scopesUsed,
    }
  }

  return composeTwoImportMaps(importMap, { imports, scopes })
}

const tryToResolveImport = async ({
  logger,
  warn,
  specifier,
  importer,
  importedBy,
  projectDirectoryUrl,
  trackAndResolveImport,
  runtime,
  bareSpecifierAutomapping,
  extensionlessAutomapping,
  magicExtensions,
  performAutomapping,
}) => {
  if (runtime === "node" && isSpecifierForNodeCoreModule(specifier)) {
    return null
  }

  let gotBareSpecifierError = false
  let importUrl
  try {
    importUrl = trackAndResolveImport(specifier, importer)
  } catch (e) {
    if (e !== BARE_SPECIFIER_ERROR) {
      throw e
    }
    gotBareSpecifierError = true
    importUrl = resolveUrl(specifier, importer)
  }

  if (importUrl.startsWith("http:") || importUrl.startsWith("https:")) {
    // NICE TO HAVE: perform an http request and check for 404 and things like that
    // the day we do the http request, this function would return both
    // if the file is found and the file content
    // because once http request is done we can await response body
    // CURRENT BEHAVIOUR: consider http url as found without checking
    // is means returning "null" so that import is not visited
    return null
  }

  const { magicExtension, found, url } = await resolveFile(importUrl, {
    magicExtensionEnabled: true,
    magicExtensions: magicExtensionWithImporterExtension(
      magicExtensions || [],
      importer,
    ),
  })

  const packageDirectoryUrl = packageDirectoryUrlFromUrl(
    url,
    projectDirectoryUrl,
  )
  const packageFileUrl = resolveUrl("package.json", packageDirectoryUrl)
  const scope =
    packageDirectoryUrl === projectDirectoryUrl
      ? undefined
      : `./${urlToRelativeUrl(packageDirectoryUrl, projectDirectoryUrl)}`
  const automapping = {
    scope,
    from: specifier,
    to: `./${urlToRelativeUrl(url, projectDirectoryUrl)}`,
  }

  if (gotBareSpecifierError) {
    if (!found) {
      warn(
        createImportResolutionFailedWarning({
          specifier,
          importedBy,
          gotBareSpecifierError,
          suggestsNodeRuntime:
            runtime !== "node" && isSpecifierForNodeCoreModule(specifier),
        }),
      )
      return null
    }

    if (!bareSpecifierAutomapping) {
      warn(
        createImportResolutionFailedWarning({
          specifier,
          importedBy,
          gotBareSpecifierError,
          automapping,
        }),
      )
      return null
    }
    logger.debug(
      createBareSpecifierAutomappingMessage({
        specifier,
        importedBy,
        automapping,
      }),
    )
    performAutomapping(automapping)
    return url
  }

  if (!found) {
    warn(
      createImportResolutionFailedWarning({
        specifier,
        importedBy,
      }),
    )
    return null
  }

  if (magicExtension) {
    if (!extensionlessAutomapping) {
      const mappingFoundInPackageExports =
        await extensionIsMappedInPackageExports(packageFileUrl)

      if (!mappingFoundInPackageExports) {
        warn(
          createImportResolutionFailedWarning({
            specifier,
            importedBy,
            magicExtension,
            automapping,
          }),
        )
        return null
      }

      logger.debug(
        createExtensionLessAutomappingMessage({
          specifier,
          importedBy,
          automapping,
          mappingFoundInPackageExports,
        }),
      )
      performAutomapping(automapping)
      return url
    }

    logger.debug(
      createExtensionLessAutomappingMessage({
        specifier,
        importedBy,
        automapping,
      }),
    )
    performAutomapping(automapping)
    return url
  }

  return url
}

const extensionIsMappedInPackageExports = async (packageFileUrl) => {
  const closestPackageObject = await readFile(packageFileUrl, {
    as: "json",
  })
  // it's imprecise because we are not ensuring the wildcard correspond
  // to the required mapping, but good enough for now
  const containsWildcard = Object.keys(closestPackageObject.exports || {}).some(
    (key) => key.includes("*"),
  )
  return containsWildcard
}

const packageDirectoryUrlFromUrl = (url, projectDirectoryUrl) => {
  const relativeUrl = urlToRelativeUrl(url, projectDirectoryUrl)

  const lastNodeModulesDirectoryStartIndex =
    relativeUrl.lastIndexOf("node_modules/")
  if (lastNodeModulesDirectoryStartIndex === -1) {
    return projectDirectoryUrl
  }

  const lastNodeModulesDirectoryEndIndex =
    lastNodeModulesDirectoryStartIndex + `node_modules/`.length

  const beforeNodeModulesLastDirectory = relativeUrl.slice(
    0,
    lastNodeModulesDirectoryEndIndex,
  )
  const afterLastNodeModulesDirectory = relativeUrl.slice(
    lastNodeModulesDirectoryEndIndex,
  )
  const remainingDirectories = afterLastNodeModulesDirectory.split("/")

  if (afterLastNodeModulesDirectory[0] === "@") {
    // scoped package
    return `${projectDirectoryUrl}${beforeNodeModulesLastDirectory}${remainingDirectories
      .slice(0, 2)
      .join("/")}`
  }
  return `${projectDirectoryUrl}${beforeNodeModulesLastDirectory}${remainingDirectories[0]}/`
}

const magicExtensionWithImporterExtension = (magicExtensions, importer) => {
  const importerExtension = urlToExtension(importer)
  const magicExtensionsWithoutImporterExtension = magicExtensions.filter(
    (ext) => ext !== importerExtension,
  )
  return [importerExtension, ...magicExtensionsWithoutImporterExtension]
}
