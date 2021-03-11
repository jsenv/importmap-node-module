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
import { readFile, resolveUrl, urlToExtension } from "@jsenv/util"
import { resolveImport } from "@jsenv/import-map"
import { memoizeAsyncFunctionByUrl } from "../memoizeAsyncFunctionByUrl.js"
import { parseSpecifiersFromFile } from "./parseSpecifiersFromFile.js"
import { showSource } from "./showSource.js"

const BARE_SPECIFIER_ERROR = {}

export const getImportMapFromJsFiles = async ({
  logLevel,
  importMap,
  projectDirectoryUrl,
  magicExtensions = [".js", ".jsx", ".ts", ".tsx", ".node", ".json"],
  runtime,
  packagePreferences,
}) => {
  const logger = createLogger({ logLevel })

  const visitFile = async (specifier, importer, { importedIn }) => {
    let fileUrl
    let bareSpecifier = false

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
      bareSpecifier = true
    }

    // TODO: auto ajouter importer extension dans les magic extensions

    if (bareSpecifier) {
      // - s'il existe un fichier avec le meme nom
      // -> suggerer un remapping et lajouter de force
      // - si magic extension
      // -> suggerer un remapping et l'ajouter de force
    } else {
      // - si magic extension
      // -> suggerer un remapping et l'ajouter de force
    }

    if (!fileUrl) {
      logger.warn(
        formatFileNotFoundLog({
          specifier,
          importedIn,
          magicExtensions,
        }),
      )
      return
    }

    const fileContent = await readFileContent(fileUrl)
    const specifiers = await parseSpecifiersFromFile(fileUrl, { fileContent })

    await Promise.all(
      Object.keys(specifiers).map(async (specifier) => {
        const specifierInfo = specifiers[specifier]
        await visitFile(specifier, fileUrl, {
          importedIn: showSource({
            url: fileUrl,
            line: specifierInfo.line,
            column: specifierInfo.column,
            source: fileContent,
          }),
        })
      }),
    )
  }
  const visitFileMemoized = memoizeAsyncFunctionByUrl(visitFile)

  const readFileContent = memoizeAsyncFunctionByUrl((fileUrl) => {
    return readFile(fileUrl, { as: "string" })
  })

  const rootPackageFileUrl = resolveUrl("package.json", projectDirectoryUrl)
  const rootPackageObject = await readFileContent(rootPackageFileUrl)
  const rootMainInfo = mainFromPackageObject({
    packageObject: rootPackageObject,
    packageFileUrl: rootPackageFileUrl,
    runtime,
    packagePreferences,
  })
  await visitFileMemoized(rootMainInfo.specifier, rootPackageFileUrl, {
    importedIn: rootMainInfo.importedIn,
  })
}

const mainFromPackageObject = ({ packageObject, packageFileUrl, runtime }) => {
  // idéalement on lirait aussi package.exports
  // pour y trouver le point d'entrée principal
  // soit ".", soit la chaine directe

  if ("module" in packageObject) {
    return {
      specifier: packageObject.module,
      importedIn: `${packageFileUrl}#module`,
    }
  }

  if ("jsnext:main" in packageObject) {
    return {
      specifier: packageObject["jsnext:main"],
      importedIn: `${packageFileUrl}#jsnext:main`,
    }
  }

  if (runtime === "browser" && "browser" in packageObject) {
    return {
      specifier: packageObject.browser,
      importedIn: `${packageFileUrl}#browser`,
    }
  }

  if ("main" in packageObject) {
    return {
      specifier: packageObject.main,
      importedIn: `${packageFileUrl}#main`,
    }
  }

  return {
    specifier: "index",
    importedIn: `${packageFileUrl}#default`,
  }
}

const formatFileNotFoundLog = ({ specifier, expectedUrl, magicExtensions, importedIn }) => {
  return createDetailedMessage(`Cannot find file for "${specifier}"`, {
    "imported in": importedIn,
    "file url": expectedUrl,
    ...(urlToExtension(expectedUrl) === ""
      ? { ["extensions tried"]: magicExtensions.join(`,`) }
      : {}),
  })
}
