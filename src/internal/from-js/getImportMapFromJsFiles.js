/*

IL SERAIT BIEN DE CONNAITRE TOUTES LES IMPORTMAPS
POUR PAS DIRE DE BETISES:
- que ce soit parce que un bare specifier n'a pas de remapping
-> on pourrait ne pas log de warning dans ce cas
mais c'est dommage

- ou parce que on trouve pas un fichier (parce qu'il serait remap ailleurs sans etre un bare specifier)
-> use case rare mais pourquoi pas

pour chaque bare specifier error
(donc pas dans importmap des node_modules)

- sinon
  -> suggerer que c'est une dépendance qu'il faut ajouter au package.json
  non plutot un log de type debug

si c'est pas un bare specifier et que le fichier est pas trouvé

-> warning et puis c'est tout

*/

import { createLogger, createDetailedMessage } from "@jsenv/logger"
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
  logLevel,
  importMap,
  projectDirectoryUrl,
  magicExtensions = [".js", ".jsx", ".ts", ".tsx", ".node", ".json"],
}) => {
  const logger = createLogger({ logLevel })
  const projectPackageFileUrl = resolveUrl("./package.json", projectDirectoryUrl)

  importMap = normalizeImportMap(importMap, projectDirectoryUrl)

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

  const visitFile = async (specifier, importer, { importedBy }) => {
    let fileUrl
    let gotBareSpecifierError = false

    try {
      fileUrl = resolveImport({
        specifier,
        importer,
        importMap,
        defaultExtension: false,
        createBareSpecifierError: () => BARE_SPECIFIER_ERROR,
      })
    } catch (e) {
      if (e !== BARE_SPECIFIER_ERROR) {
        throw e
      }
      gotBareSpecifierError = true
    }

    const fileUrlOnFileSystem = await resolveFile(fileUrl, {
      magicExtensions: magicExtensionWithImporterExtension(magicExtensions, importer),
    })

    if (!fileUrlOnFileSystem) {
      logger.warn(
        formatFileNotFoundLog({
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
      logger.warn(
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

const formatFileNotFoundLog = ({ specifier, importedBy, fileUrl, magicExtensions }) => {
  return createDetailedMessage(`Cannot find file for "${specifier}"`, {
    "imported by": importedBy,
    "file url": fileUrl,
    ...(urlToExtension(fileUrl) === "" ? { ["extensions tried"]: magicExtensions.join(`, `) } : {}),
  })
}

const formatAutoMappingSpecifierWarning = ({
  importedBy,
  autoMapping,
  closestPackageDirectoryUrl,
  closestPackageObject,
}) => {
  return `
${createDetailedMessage(`Auto mapping ${autoMapping.from} to ${autoMapping.to}.`, {
  "specifier origin": importedBy,
  "suggestion": decideAutoMappingSuggestion({
    autoMapping,
    closestPackageDirectoryUrl,
    closestPackageObject,
  }),
})}
`
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

    return `Add
${mappingToImportmapString(autoMapping)}
into ${packageImportmapFileUrl}.`
  }

  return `Add
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

const mappingToExportsFieldString = ({ from, to }) => {
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
