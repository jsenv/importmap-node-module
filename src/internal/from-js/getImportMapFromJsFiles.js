import { createDetailedMessage } from "@jsenv/logger"
import { resolveUrl, readFile, urlToExtension, urlToRelativeUrl } from "@jsenv/util"
import { normalizeImportMap, resolveImport } from "@jsenv/import-map"
import {
  memoizeAsyncFunctionByUrl,
  memoizeAsyncFunctionBySpecifierAndImporter,
} from "../memoizeAsyncFunction.js"
import { parseSpecifiersFromFile } from "./parseSpecifiersFromFile.js"
import { showSource } from "./showSource.js"
import { resolveFile } from "../resolveFile.js"

const BARE_SPECIFIER_ERROR = {}

export const getImportMapFromJsFiles = async ({
  warn,
  importMap,
  projectDirectoryUrl,
  removeUnusedMappings,
  magicExtensions = [".js", ".jsx", ".ts", ".tsx", ".node", ".json"],
}) => {
  const projectPackageFileUrl = resolveUrl("./package.json", projectDirectoryUrl)

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
        markMappingAsUsed({
          scope,
          from,
          to: scope ? importMap.scopes[scope][from] : importMap.imports[from],
        })
      },
      createBareSpecifierError: () => BARE_SPECIFIER_ERROR,
    })
  }

  const visitFile = async (specifier, importer, { importedBy }) => {
    let fileUrl
    let gotBareSpecifierError = false

    try {
      fileUrl = trackAndResolveImport(specifier, importer)
    } catch (e) {
      if (e !== BARE_SPECIFIER_ERROR) {
        throw e
      }
      if (importer === projectPackageFileUrl) {
        // cannot find package main file (package.main is "" for instance)
        // we can't discover main file and parse dependencies
        return
      }
      gotBareSpecifierError = true
      fileUrl = resolveUrl(specifier, importer)
    }

    const fileUrlOnFileSystem = await resolveFile(fileUrl, {
      magicExtensions: magicExtensionWithImporterExtension(magicExtensions, importer),
    })

    if (!fileUrlOnFileSystem) {
      warn(
        createFileNotFoundWarning({
          specifier,
          importedBy,
          fileUrl,
          magicExtensions,
        }),
      )
      return
    }

    const needsAutoMapping = fileUrlOnFileSystem !== fileUrl || gotBareSpecifierError
    if (needsAutoMapping) {
      const packageDirectoryUrl = packageDirectoryUrlFromUrl(fileUrl, projectDirectoryUrl)
      const packageFileUrl = resolveUrl("package.json", packageDirectoryUrl)
      const autoMapping = {
        scope:
          packageFileUrl === projectPackageFileUrl
            ? undefined
            : `./${urlToRelativeUrl(packageDirectoryUrl, projectDirectoryUrl)}`,
        from: specifier,
        to: `./${urlToRelativeUrl(fileUrlOnFileSystem, projectDirectoryUrl)}`,
      }
      addMapping(autoMapping)
      markMappingAsUsed(autoMapping)
      warn(
        formatAutoMappingSpecifierWarning({
          specifier,
          importedBy,
          autoMapping,
          closestPackageDirectoryUrl: packageDirectoryUrl,
          closestPackageObject: await readFile(packageFileUrl, { as: "json" }),
        }),
      )
    }

    const fileContent = await readFileContent(fileUrlOnFileSystem)
    const specifiers = await parseSpecifiersFromFile(fileUrlOnFileSystem, { fileContent })

    await Promise.all(
      Object.keys(specifiers).map(async (specifier) => {
        const specifierInfo = specifiers[specifier]
        await visitFileMemoized(specifier, fileUrlOnFileSystem, {
          importedBy: showSource({
            url: fileUrlOnFileSystem,
            line: specifierInfo.line,
            column: specifierInfo.column,
            source: fileContent,
          }),
        })
      }),
    )
  }
  const visitFileMemoized = memoizeAsyncFunctionBySpecifierAndImporter(visitFile)

  const readFileContent = memoizeAsyncFunctionByUrl((fileUrl) => {
    return readFile(fileUrl, { as: "string" })
  })

  const projectPackageObject = await readFile(projectPackageFileUrl, { as: "json" })
  await visitFileMemoized(projectPackageObject.name, projectPackageFileUrl, {
    importedBy: projectPackageObject.exports
      ? `${projectPackageFileUrl}#exports`
      : `${projectPackageFileUrl}`,
  })

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

  return { imports, scopes }
}

const packageDirectoryUrlFromUrl = (url, projectDirectoryUrl) => {
  const relativeUrl = urlToRelativeUrl(url, projectDirectoryUrl)

  const lastNodeModulesDirectoryStartIndex = relativeUrl.lastIndexOf("node_modules/")
  if (lastNodeModulesDirectoryStartIndex === -1) {
    return projectDirectoryUrl
  }

  const lastNodeModulesDirectoryEndIndex =
    lastNodeModulesDirectoryStartIndex + `node_modules/`.length

  const beforeNodeModulesLastDirectory = relativeUrl.slice(0, lastNodeModulesDirectoryEndIndex)
  const afterLastNodeModulesDirectory = relativeUrl.slice(lastNodeModulesDirectoryEndIndex)
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

const createFileNotFoundWarning = ({ specifier, importedBy, fileUrl, magicExtensions }) => {
  return {
    code: "FILE_NOT_FOUND",
    message: createDetailedMessage(`Cannot find file for "${specifier}"`, {
      "specifier origin": importedBy,
      "file url tried": fileUrl,
      ...(urlToExtension(fileUrl) === ""
        ? { ["extensions tried"]: magicExtensions.join(`, `) }
        : {}),
    }),
  }
}

const formatAutoMappingSpecifierWarning = ({
  importedBy,
  autoMapping,
  closestPackageDirectoryUrl,
  closestPackageObject,
}) => {
  return {
    code: "AUTO_MAPPING",
    message: createDetailedMessage(`Auto mapping ${autoMapping.from} to ${autoMapping.to}.`, {
      "specifier origin": importedBy,
      "suggestion": decideAutoMappingSuggestion({
        autoMapping,
        closestPackageDirectoryUrl,
        closestPackageObject,
      }),
    }),
  }
}

const decideAutoMappingSuggestion = ({
  autoMapping,
  closestPackageDirectoryUrl,
  closestPackageObject,
}) => {
  if (typeof closestPackageObject.importmap === "string") {
    const packageImportmapFileUrl = resolveUrl(
      closestPackageObject.importmap,
      closestPackageDirectoryUrl,
    )

    return `To get rid of this warning, add an explicit mapping into importmap file.
${mappingToImportmapString(autoMapping)}
into ${packageImportmapFileUrl}.`
  }

  return `To get rid of this warning, add an explicit mapping into package.json.
${mappingToExportsFieldString(autoMapping)}
into ${closestPackageDirectoryUrl}package.json.`
}

const mappingToImportmapString = ({ scope, from, to }) => {
  if (scope) {
    return JSON.stringify(
      {
        scopes: {
          [scope]: {
            [from]: to,
          },
        },
      },
      null,
      "  ",
    )
  }

  return JSON.stringify(
    {
      imports: {
        [from]: to,
      },
    },
    null,
    "  ",
  )
}

const mappingToExportsFieldString = ({ scope, from, to }) => {
  if (scope) {
    const scopeUrl = resolveUrl(scope, "file://")
    const toUrl = resolveUrl(to, "file://")
    to = `./${urlToRelativeUrl(toUrl, scopeUrl)}`
  }

  return JSON.stringify(
    {
      exports: {
        [from]: to,
      },
    },
    null,
    "  ",
  )
}
